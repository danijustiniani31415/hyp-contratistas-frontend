import {
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { NavIcon } from '../nav-icon/nav-icon';
import { NavModule, NavGroup, NavItem } from '../../../core/navigation/nav.model';
import { ProgramacionAlertasService } from '../../../core/services/programacion-alertas.service';
import { MicrosoftAuthService } from '../../../features/auth/pages/login/services/microsoft-auth.service';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, CommonModule, NavIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit, OnDestroy {
  collapsed = false;
  accountMenuOpen = false;
  expandedModule: string | null = null;
  expandedGroup: string | null = null;
  userName: string | null = null;
  userEmail: string | null = null;
  userInitials = '';
  userRole: string | null = null;

  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    public router: Router,
    public navService: NavigationService,
    public alertaSvc: ProgramacionAlertasService,
    private microsoftAuthService: MicrosoftAuthService,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.alertaSvc.checkRechazados();
    setInterval(() => this.alertaSvc.checkRechazados(), 5 * 60 * 1000);
    if (isPlatformBrowser(this.platformId)) {
      this.collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.userName = user?.displayName ?? null;
      this.userEmail = user?.email ?? null;
      this.userRole = user?.jobTitle ?? null;
      this.userInitials = this.computeInitials(this.userName);
    }
  }

  ngOnDestroy(): void {}

  @HostBinding('class.collapsed')
  get isCollapsed(): boolean {
    return this.collapsed;
  }

  /**
   * Lista de módulos visibles, recalculada en cada ciclo de detección de cambios.
   * Así, cuando un refresh actualiza `allowed_features`, los módulos que se quedan
   * sin ninguna funcionalidad accesible desaparecen al instante (no solo sus items).
   */
  get mainModules(): NavModule[] {
    return this.navService.getModules().filter((m) => m.key !== 'configuracion');
  }

  get configModule(): NavModule | undefined {
    return this.navService.getModules().find((m) => m.key === 'configuracion');
  }

  private computeInitials(name: string | null): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
    this.expandedModule = null;
    this.expandedGroup = null;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(this.collapsed));
    }
  }

  toggleAccountMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  toggleSidebarGroup(label: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedGroup = this.expandedGroup === label ? null : label;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.accountMenuOpen = false;
    }
  }

  isActiveModule(baseRoute: string): boolean {
    const url = this.router.url;
    if (baseRoute === '/habilitacion/gestion') {
      return url.startsWith('/habilitacion/gestion');
    }
    if (baseRoute === '/ssoma') {
      return (url === '/ssoma' || url.startsWith('/ssoma/')) &&
             !url.startsWith('/ssoma/gestion');
    }
    // 'Actas de Reunión' es su propio módulo aunque su ruta siga bajo /projects
    // (no se movieron archivos): sin esto, "Proyectos" quedaba marcado activo a la vez.
    if (baseRoute === '/projects') {
      return (url === '/projects' || url.startsWith('/projects/')) &&
             !url.startsWith('/projects/actas-reunion');
    }
    return url === baseRoute || url.startsWith(baseRoute + '/');
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  hasAccordion(module: NavModule): boolean {
    return this.navService.isExpandable(module);
  }

  onModuleClick(module: NavModule): void {
    this.accountMenuOpen = false;

    // Módulos con accordion: toggle in-place (solo con el sidebar expandido;
    // colapsado no hay dónde desplegar, así que se navega directamente).
    if (!this.collapsed && this.navService.isExpandable(module)) {
      this.expandedModule = this.expandedModule === module.key ? null : module.key;
      this.expandedGroup = null;
      return;
    }

    // Navegación directa: se resuelve a la ruta preferida (landing) si el usuario
    // tiene acceso, o al primer item accesible del módulo como fallback.
    const route = this.navService.resolveLanding(module);
    if (route) this.router.navigate([route]);
    this.expandedModule = null;
  }

  async logout(): Promise<void> {
    await this.microsoftAuthService.logout();
    this.router.navigate(['/auth/login']);
  }

  trackByModuleKey(_: number, module: NavModule): string {
    return module.key;
  }

  trackByGroupLabel(_: number, group: NavGroup): string {
    return group.label;
  }

  trackByItemRoute(_: number, item: NavItem): string {
    return item.route;
  }
}
