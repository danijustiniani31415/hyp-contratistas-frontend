import { Component, Input, Output, EventEmitter, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { NavIcon } from '../nav-icon/nav-icon';
import { NavModule, NavGroup, NavItem } from '../../../core/navigation/nav.model';
import { MicrosoftAuthService } from '../../../features/auth/pages/login/services/microsoft-auth.service';

@Component({
  selector: 'app-sidebar-mobile',
  standalone: true,
  imports: [RouterModule, CommonModule, NavIcon],
  templateUrl: './sidebar-mobile.html',
  styleUrl: './sidebar-mobile.css',
})
export class SidebarMobile implements OnInit {
  @Input() menuOpen: boolean = false;
  @Output() menuOpenChange = new EventEmitter<boolean>();

  expandedModule: string | null = null;
  expandedGroup: string | null = null;
  allModules: NavModule[] = [];
  userName: string | null = null;
  userEmail: string | null = null;
  userInitials = '';
  userRole: string | null = null;

  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    public router: Router,
    public navService: NavigationService,
    private microsoftAuthService: MicrosoftAuthService,
  ) {}

  ngOnInit(): void {
    this.allModules = this.navService.getModules();
    if (isPlatformBrowser(this.platformId)) {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.userName = user?.displayName ?? null;
      this.userEmail = user?.email ?? null;
      this.userRole = user?.jobTitle ?? null;
      this.userInitials = this.computeInitials(this.userName);
    }
  }

  get mainModules(): NavModule[] {
    return this.allModules.filter((m) => m.key !== 'configuracion');
  }

  get configModule(): NavModule | undefined {
    return this.allModules.find((m) => m.key === 'configuracion');
  }

  private computeInitials(name: string | null): string {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }

  close(): void {
    this.menuOpenChange.emit(false);
  }

  isActiveModule(baseRoute: string): boolean {
    const url = this.router.url;
    if (baseRoute === '/habilitacion/gestion') {
      return url.startsWith('/habilitacion/gestion') ||
             url.startsWith('/habilitacion/dashboard-contratista');
    }
    if (baseRoute === '/ssoma') {
      return (url === '/ssoma' || url.startsWith('/ssoma/')) &&
             !url.startsWith('/ssoma/gestion');
    }
    return url === baseRoute || url.startsWith(baseRoute + '/');
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  hasAccordion(module: NavModule): boolean {
    return this.navService.isExpandable(module);
  }

  toggleGroup(label: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedGroup = this.expandedGroup === label ? null : label;
  }

  onModuleClick(module: NavModule): void {
    // Módulos con accordion: toggle in-place, no cierra el drawer
    if (this.navService.isExpandable(module)) {
      this.expandedModule = this.expandedModule === module.key ? null : module.key;
      this.expandedGroup = null;
      return;
    }

    // Navegación directa: se resuelve a la ruta preferida (landing) si el usuario
    // tiene acceso, o al primer item accesible del módulo como fallback.
    const route = this.navService.resolveLanding(module);
    if (route) this.router.navigate([route]);
    this.close();
  }

  navigateAndClose(route: string): void {
    this.router.navigate([route]);
    this.close();
  }

  async logout(): Promise<void> {
    this.close();
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
