import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { NotificacionesBell } from '../notificaciones/notificaciones-bell';

export interface SsomaHeaderPill {
  icono: string;
  texto: string;
  warn?: boolean;
}

export interface SsomaHeaderBtn {
  label: string;
  icono: string;
}

export interface AbrilPageTab {
  label: string;
  icono: string;
  route?: string;
  active?: boolean;
  /** Por defecto routerLinkActive activa la pestaña si la URL actual EMPIEZA con `route`
   *  (subset match) — así una pestaña con ruta base (ej. path: '') queda marcada activa
   *  en todas sus rutas hijas, aunque el usuario esté en una pantalla que ni siquiera es
   *  una pestaña (ej. un detalle navegado desde otra pestaña). Pasar `exact: true` cuando
   *  el set de pestañas de la página no debe tener ese comportamiento de prefijo. */
  exact?: boolean;
  featureKey?: string;
  /** La pestaña se muestra si el usuario tiene acceso a AL MENOS UNO de estos
   *  features. Útil para pestañas "contenedor" (p. ej. Configuración) que
   *  agrupan varias sub-secciones con su propio featureKey. */
  featureKeys?: string[];
  /** Roles que también habilitan la pestaña (incluye los centinelas CONTRATISTA/
   *  CLINICA), igual que en los items del sidebar. Necesario para pestañas cuya
   *  sesión no viaja con allowed_features y se resuelve por rol (p. ej. Clínica). */
  roles?: string[];
}

export interface AbrilPageTabGroup {
  label: string;
  icono?: string;
  tabs: AbrilPageTab[];
}

@Component({
  selector: 'app-abril-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificacionesBell],
  templateUrl: './abril-page-header.component.html',
  styleUrl: './abril-page-header.component.css',
})
export class AbrilPageHeaderComponent implements OnInit, OnDestroy {
  @Input() badge = '';
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() pills: SsomaHeaderPill[] = [];
  @Input() tabs: AbrilPageTab[] = [];
  /**
   * La página proyecta contenido en tabsExtra (ej. el botón Filtros) aunque no
   * tenga pestañas. Sin esto, Angular no tiene forma de saber si `<ng-content
   * select="[tabsExtra]">` recibió algo — se necesita este flag explícito para
   * no mostrar una barra/borde vacío en páginas sin pestañas NI tabsExtra
   * (detalle, formularios), pero sí mostrarlo en páginas que solo tienen
   * tabsExtra (ej. Accidentes lista, Auditoría ATS lista, Proyectos
   * Habilitados, Control de Semana en su pestaña "Semanas").
   */
  @Input() hasExtra = false;
  @Input() tabGroups: AbrilPageTabGroup[] = [];
  @Input() botonPrimario?: SsomaHeaderBtn;
  @Input() botonPrimarioDeshabilitado = false;
  @Input() botonPrimarioTooltip?: string;
  @Input() botonSecundario?: SsomaHeaderBtn;
  @Input() botonSecundarioDeshabilitado = false;
  @Input() botonSecundarioTooltip?: string;
  /**
   * Segundo botón ghost del encabezado, a la DERECHA del secundario. Existe para
   * las páginas que necesitan dos acciones de header a la vez (ej. EMOs:
   * "Descargar Excel" + "Configuración"); sin esto había que colgar el segundo
   * botón como markup a mano en la página, saltándose el estándar visual.
   * Se declara igual que el secundario y se omite cuando no aplica.
   */
  @Input() botonTerciario?: SsomaHeaderBtn;
  @Input() botonTerciarioDeshabilitado = false;
  @Input() botonTerciarioTooltip?: string;
  @Output() primaryClick = new EventEmitter<void>();
  @Output() secondaryClick = new EventEmitter<void>();
  @Output() tertiaryClick = new EventEmitter<void>();
  @Output() menuClick = new EventEmitter<void>();
  @Output() tabClick = new EventEmitter<AbrilPageTab>();

  private layoutService = inject(LayoutService);
  private navigationService = inject(NavigationService);
  private router = inject(Router);

  /**
   * Grupos con al menos una pestaña accesible (sus `tabs` ya vienen filtrados por
   * acceso). Un grupo cuyas pestañas el usuario no puede ver no debe aparecer en el
   * selector de grupos ni ser navegable: así se evita el botón de grupo que, al
   * hacer clic, redirige al inicio/boletín.
   */
  get visibleGroups(): AbrilPageTabGroup[] {
    return this.tabGroups
      .map((g) => ({ ...g, tabs: g.tabs.filter((t) => this.navigationService.isNavEntryAllowed(t)) }))
      .filter((g) => g.tabs.length > 0);
  }

  get hasGroups(): boolean {
    return this.visibleGroups.length > 1;
  }

  get activeGroupIndex(): number {
    const url = this.router.url;
    const matchesRoute = (route: string) => url === route || url.startsWith(route + '/');
    const idx = this.visibleGroups.findIndex((g) =>
      g.tabs.some((t) => t.route && matchesRoute(t.route)),
    );
    return idx >= 0 ? idx : 0;
  }

  get resolvedTabs(): AbrilPageTab[] {
    // Página con grupos → pestañas del grupo activo (aunque quede uno solo visible,
    // se muestran sus pestañas sin selector). Página sin grupos → lista plana `tabs`.
    const groups = this.visibleGroups;
    if (groups.length === 0) return this.tabs;
    return (groups[this.activeGroupIndex] ?? groups[0]).tabs;
  }

  get visibleTabs(): AbrilPageTab[] {
    // Misma regla que el sidebar (NavigationService): una pestaña se ve solo si el
    // usuario tiene acceso a su featureKey/featureKeys o cumple sus roles. Así una
    // pestaña visible siempre lleva a una ruta accesible y nunca redirige al inicio.
    // (Para páginas con grupos, `resolvedTabs` ya viene filtrado; el filtro es idempotente.)
    return this.resolvedTabs.filter((t) => this.navigationService.isNavEntryAllowed(t));
  }

  /**
   * `tabs`/`tabGroups` suelen venir de getters en la página consumidora (ej.
   * `tabsHeader` en CharlasDashboardComponent) que reconstruyen el array en cada
   * ciclo de detección de cambios. Sin trackBy, *ngFor compara por identidad de
   * objeto y ve "items nuevos" en cada ciclo, destruyendo y recreando los <a> del
   * menú constantemente — si eso cae justo entre mousedown y click, el navegador
   * pierde el evento y el usuario necesita un segundo click para navegar (bug real
   * reportado en Charlas, pero afecta a cualquier página que use este header).
   */
  trackByTab(_: number, tab: AbrilPageTab): string {
    return tab.route ?? tab.label;
  }

  trackByGroup(_: number, group: AbrilPageTabGroup): string {
    return group.label;
  }

  navigateToGroup(group: AbrilPageTabGroup): void {
    // Navega a la primera pestaña que el usuario realmente puede ver, no a la
    // primera del arreglo a secas — si la primera pestaña (ej. un Dashboard
    // restringido) no le corresponde, lo mandaría a "/" vía roleGuard aunque sí
    // tenga acceso a otras pestañas del mismo grupo (ej. "Evaluar").
    const primeraPermitida = group.tabs.find(
      (t) => t.route && this.navigationService.isNavEntryAllowed(t),
    );
    const fallback = group.tabs.find((t) => t.route)?.route;
    const ruta = primeraPermitida?.route ?? fallback;
    if (ruta) this.router.navigateByUrl(ruta);
  }

  ngOnInit(): void {
    // Avisa al layout que esta página tiene su propio hamburguesa integrado, para
    // que el layout no muestre además su botón flotante de fallback (evita el
    // solape de dos hamburguesas en móvil).
    this.layoutService.registerPageHeader();
  }

  ngOnDestroy(): void {
    this.layoutService.unregisterPageHeader();
  }

  onHamburgerClick(): void {
    this.menuClick.emit();
    this.layoutService.openMobileMenu();
  }
}
