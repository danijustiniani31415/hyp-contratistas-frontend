import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../shared/pipes/title-case.pipe';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { ClientPager } from '../../../shared/utils/client-pager';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReclutamientoService } from './services/reclutamiento.service';
import {
  Opcion,
  PipelineEtapa,
  RequerimientoGthListItem,
  ResumenReclutamiento,
} from './dtos/reclutamiento.dto';
import { GthDetalleRequerimiento } from './components/detalle/detalle';
import { estadoColors } from '../shared/estado-colors';

/**
 * Vista de GTH del módulo Reclutamiento: bandeja con las tarjetas de resumen, el aviso de
 * solicitudes nuevas, el embudo "Pipeline de reclutamiento" y la tabla de "Solicitudes de
 * contratación" de toda la organización. Es la contraparte de la vista del solicitante
 * (Solicitud de Personal); aquí GTH ve y gestiona lo que piden las jefaturas.
 */
@Component({
  standalone: true,
  selector: 'app-gth-reclutamiento',
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    StatusBadge,
    TitleCasePipe,
    Paginator,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    GthDetalleRequerimiento,
  ],
  templateUrl: './reclutamiento.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    /* El desplegable de Prioridad (position:absolute, z-50) debe sobreponerse en vez
       de quedar recortado por el overflow del wrap: al no recortar, no aparece scroll
       ni se empuja el contenido. Scoped a este componente (no afecta otras tablas).

       flex:0 0 auto es obligatorio junto con overflow:visible. El global
       (.abril-table-wrap en styles.css) trae flex:0 1 auto + min-height:0, que permite
       que el flex encoja la caja del wrap por debajo del alto real de la tabla cuando
       el contenido de arriba (tarjetas + aviso + pipeline) deja poco espacio. Con el
       overflow:auto global eso solo genera scroll interno, pero acá — al no recortar —
       la tabla se seguía pintando fuera de su caja y tapaba el paginador, que queda
       anclado al borde inferior del wrap encogido (bug visual real: se comía filas).
       Sin encogimiento el wrap abraza su contenido, el paginador cae justo debajo de
       la última fila y el scroll lo hace .page-container, que ya es overflow-auto. */
    .abril-table-wrap { overflow: visible; flex: 0 0 auto; }

    /* El encabezado de la tabla es sticky (<thead class="sticky top-0">) y, como el wrap
       no recorta (ver arriba), su contenedor de scroll es .page-container. Chrome ancla
       los sticky al *content box* del contenedor de scroll — o sea por debajo de su
       padding-top — pero recorta en el borde exterior: esos 20px de padding quedaban
       como una banda visible POR ENCIMA del encabezado y ahí se seguían pintando las
       filas al scrollear (bug real: se veían registros arriba de la fila de encabezado).
       Con padding-top:0 el tope donde se ancla el encabezado y el borde donde se recorta
       coinciden, así que las filas desaparecen exactamente detrás de él. El aire de
       arriba lo aporta ahora el margin-top del primer bloque (las tarjetas de resumen),
       que scrollea con el contenido como cualquier otra cosa, en vez del padding del
       contenedor; los valores replican el padding-top global de .page-container (16px en
       teléfono, 20px desde 640px) para no cambiar nada visualmente. */
    .page-container { padding-top: 0; }
    .page-container > *:first-child { margin-top: 16px; }
    @media (min-width: 640px) {
      .page-container > *:first-child { margin-top: 20px; }
    }

    /* ── Responsive ───────────────────────────────────────────────────────
       Las 9 columnas de la tabla no entran por debajo de ~1024px y, como acá
       .abril-table-wrap no recorta (overflow:visible, ver arriba), ese
       desborde lo terminaba scrolleando .page-container: al desplazarse para
       ver la tabla se arrastraba de lado TODA la vista — tarjetas, aviso y
       pipeline incluidos — y la página quedaba ilegible en móvil (bug real,
       se veía el contenido cortado por la izquierda). Debajo de ese ancho la
       tabla se cambia por tarjetas, mismo patrón que Revisiones y
       Observaciones de Arquitectura Comercial. La lista es la misma: comparten
       filtros, paginación y acciones, solo cambia cómo se dibuja. */
    .rec-cards { display: none; }

    @media (max-width: 1023.98px) {
      .abril-table-wrap { display: none; }
      .rec-cards { display: grid; grid-template-columns: 1fr; gap: 10px; }
      /* Objetivo táctil: 28px del estándar es cómodo con mouse, corto con el dedo. */
      .rec-cards .abril-action-btn { width: 32px; height: 32px; font-size: 15px; }
    }

    /* Tablet: una sola columna de tarjetas queda enorme y vacía; con auto-fill
       entran dos por fila sin cambiar nada del layout del teléfono. */
    @media (min-width: 640px) and (max-width: 1023.98px) {
      .rec-cards { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    }

    /* Teléfono: las 4 tarjetas de resumen apiladas ocupaban ~400px de alto, casi
       una pantalla completa antes de ver el pipeline y la lista. A dos columnas
       y con medidas compactas entran de una sola vista. Todo va acotado a este
       @media para no alterar el desktop. */
    @media (max-width: 639.98px) {
      .page-container { gap: 12px; }

      .rec-kpis { gap: 10px; }
      .rec-kpi { padding: 10px 11px; gap: 10px; }
      .rec-kpi-icon { width: 34px; height: 34px; border-radius: 8px; }
      .rec-kpi-svg { width: 18px; height: 18px; }
      .rec-kpi-value { font-size: 20px; }
      .rec-kpi-label { font-size: 11.5px; margin-top: 3px; line-height: 1.2; }
      .rec-kpi-sub { font-size: 10px; line-height: 1.2; }

      .rec-aviso { padding: 10px 12px; gap: 10px; }
      .rec-aviso-icon { width: 30px; height: 30px; }
      .rec-aviso-text { font-size: 12.5px; line-height: 1.35; }

      .rec-pipeline-card { padding: 12px; }
      .rec-pipeline-title { font-size: 13.5px; margin-bottom: 10px; }
      .rec-pipeline-dot { width: 36px; height: 36px; font-size: 13px; }
      .rec-pipeline-name { font-size: 10.5px; }
      /* min-width del conector: cuánto se puede comprimir el embudo antes de
         necesitar scroll. margin-top = radio del círculo, para que la línea
         quede a su altura media (18px con círculos de 36px). */
      .rec-pipeline-link { min-width: 10px; margin-top: 18px; }
      /* El embudo se arrastra con el dedo: la barra de scroll ocupaba alto y
         se leía como un corte. Mismo criterio que las pestañas del header
         (.abril-tabs__nav en abril-page-header.component.css). */
      .rec-pipeline { scrollbar-width: none; }
      .rec-pipeline::-webkit-scrollbar { display: none; }
    }
  `],
})
export class GthReclutamiento implements OnInit {
  anioActual = new Date().getFullYear();

  /** Contadores de las tarjetas de resumen (los calcula el backend junto con la bandeja). */
  resumen: ResumenReclutamiento = {
    enProceso: 0,
    vacantesAbiertas: 0,
    evaluacionesProgramadas: 0,
    procesosCerrados: 0,
    solicitudesNuevas: 0,
  };

  /** Etapas del embudo "Pipeline de reclutamiento", en orden (vienen del backend). */
  pipeline: PipelineEtapa[] = [];

  solicitudes: RequerimientoGthListItem[] = [];
  /** Catálogo de prioridades (Alta/Media/Baja) para el desplegable de la columna. */
  prioridades: Opcion[] = [];

  // ── Filtros ───────────────────────────────────────────────────────────
  searchText = '';
  filtrosAbiertos = false;

  /**
   * Filtro del aviso "N solicitudes de vacante nuevas de jefatura": al hacer clic, la tabla queda
   * acotada a las que GTH todavía no ha tomado. Cuenta como filtro activo y se limpia con
   * "Limpiar filtros" como cualquier otro.
   */
  soloNuevas = false;

  /** Requerimiento abierto en el modal de detalle (null = modal cerrado). */
  detalleId: number | null = null;

  /**
   * Candidato cuyo modal «Ver formulario» se abre encima del detalle al entrar. Solo lo llena el
   * enlace del correo de formulario completado (`?formulario=<candidatoId>`); en la navegación
   * normal queda en null y el detalle abre sin nada encima.
   */
  detalleFormularioCandidatoId: number | null = null;

  private readonly pager = new ClientPager<RequerimientoGthListItem>();

  constructor(
    private service: ReclutamientoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  /** feature_key que habilita la configuración (dinámico vía role_feature en BD). */
  private static readonly FEATURE_CONFIG = 'gestion-gth.reclutamiento.configuracion';

  /** ¿El usuario puede configurar el correo? (según los roles asignados a la feature). */
  get puedeConfigurar(): boolean {
    return this.authService.hasFeature(GthReclutamiento.FEATURE_CONFIG);
  }

  /** Botón "Configuración" del header: solo si el rol del usuario tiene la feature. */
  get botonConfiguracion() {
    return this.puedeConfigurar ? { label: 'Configuración', icono: 'ti-settings' } : undefined;
  }

  /** Lleva a la pantalla de configuración de correos de reclutamiento (ya no es un modal). */
  abrirConfiguracion(): void {
    if (!this.puedeConfigurar) return;
    this.router.navigate(['/gestion-gth/reclutamiento/configuracion']);
  }

  ngOnInit(): void {
    // `/gestion-gth/reclutamiento/requerimiento/:id` es la URL del botón del correo de decisión
    // de long list: abre ese requerimiento directamente. Sin id, la pantalla es solo la bandeja.
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) this.detalleId = id;

    // `?formulario=<candidatoId>` lo agrega el correo de «formulario completado»: además del
    // requerimiento, abre el modal «Ver formulario» de ese postulante, que es donde GTH lo aprueba
    // o lo rechaza. El detalle valida que el candidato sea realmente de ese requerimiento.
    const candidatoId = Number(this.route.snapshot.queryParamMap.get('formulario'));
    if (this.detalleId && Number.isInteger(candidatoId) && candidatoId > 0)
      this.detalleFormularioCandidatoId = candidatoId;

    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getBandeja().subscribe({
      next: (data) => {
        this.resumen = data.resumen;
        this.pipeline = data.pipeline;
        this.solicitudes = data.solicitudes;
        this.prioridades = data.prioridades;
        this.pager.reset();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * Cambia la prioridad de un requerimiento desde el desplegable de la tabla. Actualiza de forma
   * optimista y revierte si el guardado falla. (allowClear está desactivado, así que el valor
   * nunca llega null desde el combo, pero se protege igual.)
   */
  onPrioridadChange(s: RequerimientoGthListItem, prioridadId: number | null): void {
    if (prioridadId == null || prioridadId === s.prioridadId) return;

    const prevId = s.prioridadId;
    const prevNombre = s.prioridadNombre;
    s.prioridadId = prioridadId;
    s.prioridadNombre = this.prioridades.find((p) => p.id === prioridadId)?.nombre ?? s.prioridadNombre;

    this.service.updatePrioridad(s.requerimientoId, prioridadId).subscribe({
      error: (err: HttpErrorResponse) => {
        s.prioridadId = prevId;
        s.prioridadNombre = prevNombre;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Aviso de solicitudes nuevas ────────────────────────────────────────
  /** Alterna el filtro del aviso: deja la tabla solo con las solicitudes nuevas (o la restaura). */
  toggleSoloNuevas(): void {
    this.soloNuevas = !this.soloNuevas;
    this.onFilterChange();
  }

  // ── Filtros ────────────────────────────────────────────────────────────
  get filtrosActivos(): number {
    return (this.searchText.trim() ? 1 : 0) + (this.soloNuevas ? 1 : 0);
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.soloNuevas = false;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  get filteredSolicitudes(): RequerimientoGthListItem[] {
    const q = this.searchText.trim();
    let filtradas = this.solicitudes;

    // "Solicitudes nuevas" = las que acaban de llegar a GTH. Con el paso previo de Gerencia
    // General eso es VALIDACION_GTH; se sigue incluyendo NUEVO por los requerimientos anteriores
    // a ese cambio (mismo criterio que el contador que calcula el backend).
    if (this.soloNuevas)
      filtradas = filtradas.filter(
        (s) => s.estadoCodigo === 'NUEVO' || s.estadoCodigo === 'VALIDACION_GTH',
      );

    if (!q) return filtradas;
    return filtradas.filter((s) =>
      SearchInput.matches(
        [s.codigo, s.puesto, s.area, s.proyectoObra, s.estadoNombre].filter(Boolean).join(' '),
        q,
      ),
    );
  }

  /** Mensaje de lista vacía, compartido por la tabla (desktop) y las tarjetas (móvil). */
  get mensajeVacio(): string {
    return this.searchText.trim() || this.soloNuevas
      ? 'Sin resultados para los filtros aplicados.'
      : 'Aún no hay solicitudes de contratación registradas.';
  }

  // ── Paginación (cliente) ───────────────────────────────────────────────
  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredSolicitudes);
  }

  get pagedSolicitudes(): RequerimientoGthListItem[] {
    return this.pager.page(this.filteredSolicitudes);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Modal de detalle (ojo de la tabla) ─────────────────────────────────
  abrirDetalle(s: RequerimientoGthListItem): void {
    this.detalleId = s.requerimientoId;
  }

  /** Cierra el modal de detalle; si hubo cambios guardados, refresca la bandeja. */
  onDetalleCerrado(huboCambios: boolean): void {
    this.detalleId = null;
    // Si se llegó por el enlace del correo (`/reclutamiento/requerimiento/:id`), se limpia la URL
    // para que un refresco no vuelva a abrir el modal. La navegación remonta el componente, así
    // que ya trae la bandeja recargada y no hace falta el load() de abajo.
    if (this.route.snapshot.paramMap.get('id')) {
      this.router.navigate(['/gestion-gth/reclutamiento']);
      return;
    }
    if (huboCambios) this.load();
  }

  // ── Colores del badge de estado (compartidos con el modal de detalle) ───
  estadoColors = estadoColors;
}
