import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../shared/components/section-tabs/section-tabs';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { NavigationService } from '../../../core/navigation/navigation.service';
// Categorías y Puestos es la primera funcionalidad de configuración de GTH. Sus componentes,
// DTOs y servicio siguen FÍSICAMENTE bajo `features/configuracion/features/categorias-puestos/`
// (donde nacieron, cuando eran configuración global) hasta que se refactoricen; lógicamente ya
// pertenecen a GTH y solo se consumen desde acá. Mismo caso que Revisores de Áreas, que vive en
// `gestion-administrativa/` y lo usa el módulo de Configuración.
import { CategoriasPuestosService } from '../../configuracion/features/categorias-puestos/services/categorias-puestos.service';
import {
  AreaNodoDto,
  CategoriaAdminDto,
  PuestoAdminDto,
} from '../../configuracion/features/categorias-puestos/dtos/categorias-puestos.dto';
import { ConfigCategorias } from '../../configuracion/features/categorias-puestos/components/categorias/categorias';
import { ConfigPuestos } from '../../configuracion/features/categorias-puestos/components/puestos/puestos';
import { GthReclutadores } from './reclutadores/pages/reclutadores';

/** Definición de una sección de configuración de GTH. */
interface ConfigSectionDef {
  id: string;
  label: string;
  /**
   * Ruta de la sección. Dos secciones pueden compartirla (Categorías y Puestos): en ese caso se
   * conmutan en local, sin navegar, para no repetir la petición del catálogo.
   */
  route: string;
  featureKey: string;
  subtitulo: string;
  /** Etiqueta del botón de crear del header. Sin valor = la sección no crea registros. */
  createLabel?: string;
}

/**
 * Contenedor de configuración de Gestión GTH.
 *
 * Agrupa bajo `/gestion-gth/configuracion` las pantallas de configuración del módulo,
 * conmutándolas con `app-section-tabs`, siguiendo el mismo patrón que
 * `costs-configuration` de Costos y Presupuestos y `ga-configuracion` de Gestión
 * Administrativa.
 *
 * Cada funcionalidad tiene su propia ruta (`/gestion-gth/configuracion/<seccion>`) con su
 * `featureKey` + `roleGuard`, y la sección activa se resuelve desde `route.data.seccion`. La
 * excepción son Categorías y Puestos: son dos pestañas de una misma funcionalidad (comparten
 * featureKey y ruta) y se conmutan en local, sin cambiar de URL, para no repetir la petición del
 * catálogo al saltar de pestaña.
 *
 * El contenedor es dueño de la data de Categorías/Puestos (una sola petición trae las dos listas,
 * que ambas secciones necesitan de entrada); el resto de secciones carga lo suyo por su cuenta.
 */
@Component({
  selector: 'app-gth-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    SectionTabs,
    FilterTriggerButton,
    ConfigCategorias,
    ConfigPuestos,
    GthReclutadores,
  ],
  templateUrl: './gth-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GthConfiguracion implements OnInit {
  /** Ruta de la funcionalidad Categorías y Puestos (sus dos secciones la comparten). */
  private static readonly RUTA_CATALOGO = '/gestion-gth/configuracion/categorias-puestos';

  /** Todas las secciones de configuración, en orden de visualización. */
  private readonly allSections: ConfigSectionDef[] = [
    {
      id: 'categorias',
      label: 'Categorías',
      route: GthConfiguracion.RUTA_CATALOGO,
      featureKey: 'gestion-gth.config.categorias-puestos',
      subtitulo:
        'Categorías del catálogo de trabajadores. La categoría es la que manda sobre los entregables, permisos y filtros internos.',
      createLabel: 'Nueva categoría',
    },
    {
      id: 'puestos',
      label: 'Puestos',
      route: GthConfiguracion.RUTA_CATALOGO,
      featureKey: 'gestion-gth.config.categorias-puestos',
      subtitulo:
        'Puestos del catálogo de trabajadores. El puesto es el cargo que se muestra en la ficha; cada uno pertenece a una categoría.',
      createLabel: 'Nuevo puesto',
    },
    {
      id: 'reclutadores',
      label: 'Reclutadores',
      route: '/gestion-gth/configuracion/reclutadores',
      featureKey: 'gestion-gth.config.reclutadores',
      subtitulo:
        'Trabajadores del área de Gestión del Talento Humano. Solo los activos salen en el desplegable «Responsable del proceso» de Reclutamiento.',
    },
  ];

  /** Secciones a las que el usuario tiene acceso (las que se muestran como pestañas). */
  visibleSections: ConfigSectionDef[] = [];
  sectionTabs: SectionTab[] = [];
  activeSection: string | null = null;

  categorias: CategoriaAdminDto[] = [];
  puestos: PuestoAdminDto[] = [];
  /** Árbol de áreas (lista plana): lo usa la sección Puestos para su filtro y su modal. */
  areaTree: AreaNodoDto[] = [];

  // Referencias a la sección activa (solo una existe a la vez por el *ngIf).
  @ViewChild(ConfigCategorias) private categoriasCmp?: ConfigCategorias;
  @ViewChild(ConfigPuestos) private puestosCmp?: ConfigPuestos;
  @ViewChild(GthReclutadores) private reclutadoresCmp?: GthReclutadores;

  constructor(
    private service: CategoriasPuestosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private navigationService: NavigationService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.visibleSections = this.allSections.filter((s) =>
      this.navigationService.isFeatureAllowed(s.featureKey),
    );
    this.sectionTabs = this.visibleSections.map((s) => ({ id: s.id, label: s.label }));

    this.route.data.subscribe((data) => {
      const seccion = (data['seccion'] as string | null | undefined) ?? null;

      // Ruta contenedora sin sección concreta: redirigir a la primera permitida.
      if (!seccion) {
        if (this.visibleSections.length) {
          this.router.navigate([this.visibleSections[0].route], { replaceUrl: true });
        } else {
          this.router.navigate(['/']);
        }
        return;
      }

      this.activeSection = seccion;

      // El catálogo lo pide el contenedor porque lo comparten Categorías y Puestos. Las demás
      // secciones cargan lo suyo, así que en ellas no se pide nada de acá.
      if (this.necesitaCatalogo && !this.categorias.length && !this.puestos.length) this.load();
    });
  }

  /** true si la sección activa se alimenta del catálogo de categorías y puestos. */
  private get necesitaCatalogo(): boolean {
    return this.activeDef?.route === GthConfiguracion.RUTA_CATALOGO;
  }

  load(): void {
    this.loaderService.show();
    this.service.getInitialData().subscribe({
      next: (data) => {
        // Ambas listas representan entidades sin orden propio: se ordenan alfabéticamente
        // acá, al asignarlas, porque ni la tabla ni app-search-select reordenan por su cuenta.
        this.categorias = [...(data.categorias ?? [])].sort((a, b) =>
          a.nombre.localeCompare(b.nombre),
        );
        this.puestos = [...(data.puestos ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
        // El árbol se pasa tal cual: la sección Puestos lo jerarquiza y lo ordena a su modo.
        this.areaTree = data.areaTree ?? [];
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  private get activeDef(): ConfigSectionDef | undefined {
    return this.allSections.find((s) => s.id === this.activeSection);
  }

  get subtitulo(): string {
    return this.activeDef?.subtitulo ?? '';
  }

  /** Botón de crear del header; undefined lo oculta en secciones sin creación. */
  get botonPrimario(): { label: string; icono: string } | undefined {
    const label = this.activeDef?.createLabel;
    return label ? { label, icono: 'ti-plus' } : undefined;
  }

  /** Componente de la sección activa (solo una existe a la vez por el *ngIf). */
  private get activeCmp(): ConfigCategorias | ConfigPuestos | GthReclutadores | undefined {
    switch (this.activeSection) {
      case 'categorias': return this.categoriasCmp;
      case 'puestos': return this.puestosCmp;
      case 'reclutadores': return this.reclutadoresCmp;
      default: return undefined;
    }
  }

  get filtrosActivos(): number {
    return this.activeCmp?.filtrosActivos ?? 0;
  }

  onSectionChange(id: string): void {
    const target = this.visibleSections.find((s) => s.id === id);
    if (!target) return;

    // Misma ruta (Categorías ↔ Puestos): se conmuta en local para no repetir la petición.
    if (target.route === this.activeDef?.route) {
      this.activeSection = id;
      return;
    }

    this.router.navigate([target.route]);
  }

  /** Abre el modal de creación de la sección activa (botón del header). */
  onCreate(): void {
    switch (this.activeSection) {
      case 'categorias': this.categoriasCmp?.openCreate(); break;
      case 'puestos': this.puestosCmp?.openCreate(); break;
    }
  }

  /** Abre el modal de filtros de la sección activa (botón proyectado en el header). */
  onOpenFilters(): void {
    const cmp = this.activeCmp;
    if (cmp) cmp.filtrosAbiertos = true;
  }
}
