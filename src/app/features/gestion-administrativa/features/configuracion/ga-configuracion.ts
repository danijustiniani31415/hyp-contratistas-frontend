import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../../shared/components/section-tabs/section-tabs';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { NavigationService } from '../../../../core/navigation/navigation.service';
import { GaLugares } from './lugares/pages/lugares';
import { GaMotivos } from './motivos/pages/motivos';
import { GaTrayectos } from '../trayectos/pages/trayectos';
import { VisibilidadSalidas } from './visibilidad-salidas/pages/visibilidad-salidas';
import { GaCarpetaAdjuntos } from './carpeta-adjuntos/pages/carpeta-adjuntos';
import { GaCorreos } from './correos/pages/correos';
import { Roles } from '../../../../core/constants/roles';
import { FirmaPersonal } from '../../../../shared/components/firma-personal/firma-personal';

import { GESTION_ADMINISTRATIVA_TABS } from '../../shared/gestion-administrativa-tabs';
/** Definición de una sección de configuración de Gestión Administrativa. */
interface ConfigSectionDef {
  id: string;
  label: string;
  route: string;
  /**
   * Feature que hay que tener para ver la sección. Sin valor, la sección se filtra por
   * <see cref="roles"/> (hoy solo "Tu firma": la firma es de la persona, no de una funcionalidad).
   */
  featureKey?: string;
  /** Roles que abren la sección cuando no se filtra por featureKey. */
  roles?: string[];
  subtitulo: string;
  /** Etiqueta del botón de crear del header. Sin valor = la sección no crea registros. */
  createLabel?: string;
}

/**
 * Contenedor de configuración de Gestión Administrativa.
 *
 * Agrupa bajo `/gestion-administrativa/configuracion` las pantallas de
 * configuración propias de salidas (lugares, motivos, trayectos, visibilidad,
 * carpeta de adjuntos y correos) conmutándolas con el componente
 * `app-section-tabs`, siguiendo el mismo patrón que `costs-configuration` de
 * Costos y Presupuestos.
 *
 * Los revisores de áreas ya NO viven aquí: definen el jefe de cada área para toda
 * la organización, así que se movieron al módulo de configuración global
 * (`/configuracion/revisores-areas`). El jefe por trabajador se asigna en el
 * formulario de Gestión de Ingresos → Trabajadores ("Jefe personalizado").
 *
 * Cada sección sigue teniendo su propia ruta
 * (`/gestion-administrativa/configuracion/<seccion>`) con su `featureKey` +
 * `roleGuard`, por lo que el control de acceso por sección y los enlaces del
 * sidebar se mantienen intactos. La sección activa se determina a partir de
 * `route.data.seccion`; las pestañas se filtran por los features a los que el
 * usuario tiene acceso.
 */
@Component({
  selector: 'app-ga-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    SectionTabs,
    FilterTriggerButton,
    GaLugares,
    GaMotivos,
    GaTrayectos,
    VisibilidadSalidas,
    GaCarpetaAdjuntos,
    GaCorreos,
    FirmaPersonal,
  ],
  templateUrl: './ga-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaConfiguracion implements OnInit {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  /** Todas las secciones de configuración, en orden de visualización. */
  private readonly allSections: ConfigSectionDef[] = [
    {
      id: 'lugares',
      label: 'Lugares',
      route: '/gestion-administrativa/configuracion/lugares',
      featureKey: 'gestion-administrativa.config.lugares',
      subtitulo: 'Lugares de origen y destino disponibles para solicitudes.',
      createLabel: 'Nuevo lugar fijo',
    },
    {
      id: 'motivos',
      label: 'Motivos',
      route: '/gestion-administrativa/configuracion/motivos',
      featureKey: 'gestion-administrativa.config.motivos',
      subtitulo: 'Motivos de salida habilitados para los trabajadores.',
      createLabel: 'Nuevo motivo',
    },
    {
      id: 'trayectos',
      label: 'Trayectos',
      route: '/gestion-administrativa/configuracion/trayectos',
      featureKey: 'gestion-administrativa.config.trayectos',
      subtitulo: 'Trayectos y tarifas de movilidad configurados.',
      createLabel: 'Nuevo trayecto',
    },
    {
      id: 'visibilidad-salidas',
      label: 'Visibilidad',
      route: '/gestion-administrativa/configuracion/visibilidad-salidas',
      featureKey: 'gestion-administrativa.config.visibilidad-salidas',
      subtitulo:
        'Define qué áreas puede ver cada trabajador en la gestión de salidas. Sin asignación, la visibilidad se resuelve automáticamente (GTH ve todo, gerentes su gerencia, administración de obra su tipo de área).',
    },
    {
      id: 'carpeta-adjuntos',
      label: 'Carpeta Adjuntos',
      route: '/gestion-administrativa/configuracion/carpeta-adjuntos',
      featureKey: 'gestion-administrativa.config.carpeta-adjuntos',
      subtitulo:
        'Carpeta de SharePoint/OneDrive donde se guardan los documentos adjuntos de las solicitudes de salida (motivos que requieren documento).',
    },
    {
      id: 'correos',
      label: 'Correos',
      route: '/gestion-administrativa/configuracion/correos',
      featureKey: 'gestion-administrativa.config.correos',
      subtitulo:
        'Define, por cada correo del flujo de salidas, a quién se le envía y a quién nunca (la exclusión gana). Cada destinatario puede ser un trabajador, un área (se envía a sus miembros) o un correo escrito a mano.',
    },
    // Por rol y no por featureKey: la firma es de la persona, no de una funcionalidad. Todo
    // USUARIO DE ABRIL entra acá a registrar la suya, y es la MISMA que se estampa en las facturas
    // de Contabilidad y en la carta oferta de Onboarding.
    {
      id: 'firma',
      label: 'Tu firma',
      route: '/gestion-administrativa/configuracion/firma',
      roles: [Roles.USUARIO_DE_ABRIL],
      subtitulo:
        'Tu firma personal. Es la que se estampa en la planilla de rendición que firmes y en el resto de documentos que firmes en la intranet.',
    },
  ];

  /** Secciones a las que el usuario tiene acceso (las que se muestran como pestañas). */
  visibleSections: ConfigSectionDef[] = [];
  sectionTabs: SectionTab[] = [];
  activeSection: string | null = null;

  // Referencias a la sección activa (solo una existe a la vez por el *ngIf).
  @ViewChild(GaLugares) private lugaresCmp?: GaLugares;
  @ViewChild(GaMotivos) private motivosCmp?: GaMotivos;
  @ViewChild(GaTrayectos) private trayectosCmp?: GaTrayectos;
  @ViewChild(VisibilidadSalidas) private visibilidadCmp?: VisibilidadSalidas;
  @ViewChild(GaCarpetaAdjuntos) private carpetaAdjuntosCmp?: GaCarpetaAdjuntos;
  @ViewChild(GaCorreos) private correosCmp?: GaCorreos;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navigationService: NavigationService,
  ) {}

  ngOnInit(): void {
    this.visibleSections = this.allSections.filter((s) =>
      this.navigationService.isNavEntryAllowed({ featureKey: s.featureKey, roles: s.roles }),
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

  /** Componente de la sección activa (todos exponen filtrosActivos / filtrosAbiertos). */
  private get activeCmp():
    | GaLugares
    | GaMotivos
    | GaTrayectos
    | VisibilidadSalidas
    | GaCarpetaAdjuntos
    | GaCorreos
    | undefined {
    switch (this.activeSection) {
      case 'lugares': return this.lugaresCmp;
      case 'motivos': return this.motivosCmp;
      case 'trayectos': return this.trayectosCmp;
      case 'visibilidad-salidas': return this.visibilidadCmp;
      case 'carpeta-adjuntos': return this.carpetaAdjuntosCmp;
      case 'correos': return this.correosCmp;
      default: return undefined;
    }
  }

  get filtrosActivos(): number {
    return this.activeCmp?.filtrosActivos ?? 0;
  }

  /**
   * "Tu firma" es un panel, no una lista: no tiene tabla que filtrar, así que el botón "Filtros"
   * no se muestra ahí (si no, quedaría un botón que no abre nada).
   */
  get seccionConFiltros(): boolean {
    return this.activeSection !== 'firma';
  }

  onSectionChange(id: string): void {
    const target = this.visibleSections.find((s) => s.id === id);
    if (target) this.router.navigate([target.route]);
  }

  /** Abre el modal de creación de la sección activa (botón del header). */
  onCreate(): void {
    switch (this.activeSection) {
      case 'lugares': this.lugaresCmp?.openCreate(); break;
      case 'motivos': this.motivosCmp?.openCreate(); break;
      case 'trayectos': this.trayectosCmp?.openCreate(); break;
    }
  }

  /** Abre el modal de filtros de la sección activa (botón proyectado en el header). */
  onOpenFilters(): void {
    const cmp = this.activeCmp;
    if (cmp) cmp.filtrosAbiertos = true;
  }
}
