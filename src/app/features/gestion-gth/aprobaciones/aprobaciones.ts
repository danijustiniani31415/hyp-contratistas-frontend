import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../shared/pipes/title-case.pipe';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { AbrilBulkActionDirective } from '../../../shared/directives/abril-bulk-action.directive';
import { ClientPager } from '../../../shared/utils/client-pager';
import { AuthService } from '../../../core/services/auth.service';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { GthAprobacionDecision } from './components/decision/decision';
import { AprobacionesService } from './services/aprobaciones.service';
import { estadoAprobacionColors } from './estado-aprobacion-colors';
import {
  AprobacionDecisionOmitida,
  AprobacionListItem,
  AprobacionNivel,
  AprobacionNivelResumen,
  AprobacionesResumen,
} from './dtos/aprobaciones.dto';

/**
 * «Aprobaciones» (Gestión GTH): la bandeja de los gerentes. Cada fila es una solicitud de personal
 * recortada a las vacantes que le toca decidir a quien mira.
 *
 * El rol abre la pantalla; lo que se ve dentro depende de la CATEGORÍA de la ficha de trabajador y
 * lo resuelve el backend (`nivel`). Cada nivel tiene su ÁREA y su TIPO de vacante:
 *   • Gerente General → toda la empresa, pero solo las vacantes NUEVAS. Un ingreso directo FFT
 *     no lo aprueba nadie y no llega acá (salvo los que quedaron esperando su firma de antes de
 *     ese cambio).
 *   • Gerente → su área hacia abajo, y solo los REEMPLAZOS. Firma PRIMERO.
 *   • GTH → toda la empresa, y solo los REEMPLAZOS que el gerente del área YA aprobó: su firma es
 *     la segunda, así que hasta ese momento esas solicitudes no le aparecen.
 *   • Cualquier otra categoría → ninguna solicitud; la pantalla explica por qué.
 *
 * Las vacantes de la otra ruta no llegan al frontend: `totalVacantes`, `codigos` y las casillas ya
 * vienen recortados. Todo lo que depende del nivel (tarjetas, columnas, textos) se deriva de ese
 * campo: la pantalla no decide por su cuenta quién es quién, solo pinta lo que el backend ya filtró.
 */
@Component({
  standalone: true,
  selector: 'app-gth-aprobaciones',
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
    GthAprobacionDecision,
    AbrilBulkActionDirective,
  ],
  templateUrl: './aprobaciones.html',
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    /* Igual que en Solicitud de Personal: la tabla crece a su altura natural y el
       scroll queda en .page-container, no dentro del wrapper. */
    .abril-table-wrap { flex: 0 0 auto; overflow: visible; }

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
       teléfono, 20px desde 640px) para no cambiar nada visualmente.
       Acá la lista todavía es corta y casi no scrollea, pero el bug es el mismo en cuanto
       crezca: va igual que en Reclutamiento y Solicitud de Personal. */
    .page-container { padding-top: 0; }
    .page-container > *:first-child { margin-top: 16px; }
    @media (min-width: 640px) {
      .page-container > *:first-child { margin-top: 20px; }
    }

    /* ── Aviso de alcance ─────────────────────────────────────────────────
       Una línea con de dónde sale lo que el usuario ve (o por qué no ve nada). No es
       decorativo: sin él, un gerente que solo ve 2 de las 20 solicitudes de la
       empresa no tiene forma de saber si es un filtro o un error. */
    .ap-scope {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 11px 14px; border-radius: var(--radius-standard);
      background: var(--color-abril-logo-blue-light); border: 0.5px solid #a9c9e6;
      color: #1e4a6d; font-size: 12.5px; line-height: 1.45;
    }
    .ap-scope i { font-size: 17px; color: var(--color-abril-logo-blue); flex-shrink: 0; margin-top: 1px; }
    .ap-scope--empty { background: #FEF3C7; border-color: #FCD34D; color: #78350F; }
    .ap-scope--empty i { color: #B45309; }

    /* ── Responsive ───────────────────────────────────────────────────────
       Las 8 columnas no entran por debajo de ~1100px y, como acá el wrapper no
       recorta, el desborde lo terminaba scrolleando toda la página de lado.
       Debajo de ese ancho la tabla se cambia por tarjetas: misma lista, mismo
       filtro, misma paginación y misma acción. */
    .ap-cards { display: none; }

    @media (max-width: 1099.98px) {
      .abril-table-wrap { display: none; }
      /* 'minmax(0, 1fr)' y no '1fr': '1fr' es 'minmax(auto, 1fr)', o sea que la columna
         se estira hasta el min-content de la tarjeta, y el min-content de la tarjeta lo
         fija la justificación —un <p> con 'truncate', que es 'white-space: nowrap': su
         ancho intrínseco es el texto ENTERO, sin cortar. Con una justificación larga la
         tarjeta salía unos píxeles más ancha que el aviso de alcance y los KPIs, y esos
         píxeles los scrolleaba .page-container de lado; al correrse, el padding-left de
         10px se iba y la tarjeta quedaba pegada al borde (bug real reportado en móvil).
         Con el min en 0 la columna nunca pasa del ancho disponible y la justificación
         se recorta con puntos suspensivos, igual que en la columna de la tabla. */
      .ap-cards { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
      /* Red de seguridad: ni un dato raro (una justificación de una sola palabra
         larguísima, un correo sin espacios) puede volver a mover la página de lado.
         Solo en este rango, donde la tabla está oculta y no hay nada ancho que recortar. */
      .page-container { overflow-x: hidden; }
    }

    /* La columna acota el track, pero la tarjeta es un grid item y su 'min-width: auto'
       sigue siendo su min-content: sin esto se desborda igual de su propia columna. */
    .ap-cards > * { min-width: 0; }

    @media (min-width: 640px) and (max-width: 1099.98px) {
      /* 'min(320px, 100%)' en vez de '320px' fijo: si el área útil llegara a ser menor
         que 320px (sidebar + padding en el borde bajo de este rango), la columna rígida
         desbordaría en lugar de encogerse. */
      .ap-cards { grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); }
    }

    /* Las dos casillas dentro de la tarjeta, una al lado de la otra.
       Mismo motivo que en .ap-cards: con '1fr 1fr' cada columna se estira hasta el
       min-content de su casilla, y el badge («Pendiente de decisión») es nowrap. */
    .ap-card-niveles {
      display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 8px; margin-top: 9px;
    }
    .ap-card-nivel {
      border: 0.5px solid var(--color-abril-border); border-radius: var(--radius-standard);
      padding: 7px 8px; min-width: 0;
    }
    .ap-nivel-label {
      font-size: 9px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.03em; color: #9ca3af; margin-bottom: 4px;
    }
    .ap-nivel-quien { font-size: 10.5px; color: #9ca3af; margin-top: 3px; line-height: 1.25; }

    /* 'grid-cols-2' de Tailwind ya es 'repeat(2, minmax(0, 1fr))', pero las tarjetas
       de resumen son grid items y su 'min-width: auto' las dejaría desbordar el track. */
    .ap-kpi { min-width: 0; }

    @media (max-width: 639.98px) {
      .page-container { gap: 12px; }
      .ap-kpis { gap: 10px; }
      .ap-kpi { padding: 10px 11px; gap: 10px; }
      .ap-kpi-icon { width: 34px; height: 34px; border-radius: 8px; }
      .ap-kpi-svg { width: 18px; height: 18px; }
      .ap-kpi-value { font-size: 20px; }
      .ap-kpi-label { font-size: 11.5px; margin-top: 3px; line-height: 1.2; }
    }
  `],
})
export class GthAprobaciones implements OnInit {
  anioActual = new Date().getFullYear();

  /** Aprobación abierta en el modal (null = cerrado). */
  detalleId: number | null = null;

  /** Nivel del usuario. Hasta que responde el backend se asume el más restrictivo. */
  nivel: AprobacionNivel = 'NINGUNO';

  /** Área de la que el usuario es gerente (solo con nivel GERENTE_AREA). */
  areaAlcance: string | null = null;

  resumen: AprobacionesResumen = {
    pendientes: 0,
    vacantesPendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
  };

  aprobaciones: AprobacionListItem[] = [];

  // ── Filtros ───────────────────────────────────────────────────────────
  searchText = '';
  /** '' = todas. Los demás valores son códigos de gth_aprobacion_gg_estado. */
  estadoCodigo = '';
  filtrosAbiertos = false;

  /** Opciones del filtro de estado. Orden semántico (pendiente → cerrada), no alfabético. */
  readonly estados = [
    { codigo: '', nombre: 'Todos los estados' },
    { codigo: 'PENDIENTE', nombre: 'Pendiente de decisión' },
    { codigo: 'APROBADA', nombre: 'Aprobada (todas)' },
    { codigo: 'APROBADA_PARCIAL', nombre: 'Aprobada parcialmente' },
    { codigo: 'RECHAZADA', nombre: 'Rechazada (todas)' },
  ];

  private readonly pager = new ClientPager<AprobacionListItem>();

  constructor(
    private service: AprobacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  /** feature_key que habilita la configuración (dinámico vía role_feature en BD). */
  private static readonly FEATURE_CONFIG = 'gestion-gth.reclutamiento.configuracion';

  /** ¿El usuario tiene acceso a la configuración? (según los roles asignados a la feature). */
  get puedeConfigurar(): boolean {
    return this.authService.hasFeature(GthAprobaciones.FEATURE_CONFIG);
  }

  /** Botón "Configuración" del header: solo si el rol del usuario tiene la feature. */
  get botonConfiguracion() {
    return this.puedeConfigurar ? { label: 'Configuración', icono: 'ti-settings' } : undefined;
  }

  /** Lleva a la pantalla de configuración del correo que sale al decidir. */
  abrirConfiguracion(): void {
    if (!this.puedeConfigurar) return;
    this.router.navigate(['/gestion-gth/aprobaciones/configuracion']);
  }

  ngOnInit(): void {
    // `/gestion-gth/aprobaciones/:id` es la URL del enlace del correo: abre esa
    // solicitud directamente. Sin id, la pantalla es solo la lista.
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) this.detalleId = id;

    this.load();
  }

  load(): void {
    this.loaderService.show();
    // App zoneless: hay que forzar el refresco tras el subscribe o la vista no se actualiza.
    this.service.getPanel().subscribe({
      next: (data) => {
        this.nivel = data.nivel;
        this.areaAlcance = data.areaAlcance;
        this.resumen = data.resumen;
        this.aprobaciones = data.aprobaciones;
        this.pager.reset();
        // La lista es nueva: una selección hecha sobre la anterior ya no representa nada.
        this.selectedIds.clear();
        this.anclaSeleccion = null;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Nivel del usuario ──────────────────────────────────────────────────
  get esGerenteGeneral(): boolean {
    return this.nivel === 'GERENTE_GENERAL';
  }

  /** Sin nivel: la pantalla se abre por rol, pero no hay solicitudes bajo su alcance. */
  get sinAlcance(): boolean {
    return this.nivel === 'NINGUNO';
  }

  /** true si el usuario entra como Gestión del Talento Humano. */
  get esGth(): boolean {
    return this.nivel === 'GTH';
  }

  /**
   * Las firmas que ESTA solicitud necesita, en el orden del flujo, para pintarlas en la fila. Solo
   * las que aplican: una solicitud de puras vacantes nuevas muestra únicamente a Gerencia General,
   * y una de puros reemplazos, al gerente del área y a GTH. Mostrar las tres siempre dejaría dos
   * casillas eternamente en «pendiente» que nadie va a tocar.
   */
  casillas(a: AprobacionListItem): { etiqueta: string; resumen: AprobacionNivelResumen }[] {
    const out: { etiqueta: string; resumen: AprobacionNivelResumen }[] = [];
    if (a.requiereGerenteGeneral) out.push({ etiqueta: 'Gerencia General', resumen: a.gerenteGeneral });
    if (a.requiereGerenteArea) out.push({ etiqueta: 'Gerente del área', resumen: a.gerenteArea });
    if (a.requiereGth) out.push({ etiqueta: 'GTH', resumen: a.gth });
    return out;
  }

  /** Casilla del usuario en una fila: es contra la suya que se ordena, filtra y cuenta. */
  miCasilla(a: AprobacionListItem): AprobacionNivelResumen {
    if (this.nivel === 'GERENTE_GENERAL') return a.gerenteGeneral;
    if (this.nivel === 'GTH') return a.gth;
    return a.gerenteArea;
  }

  get subtitulo(): string {
    if (this.esGerenteGeneral) return 'Vacantes nuevas de toda la organización.';
    if (this.esGth) return 'Reemplazos de toda la organización.';
    if (this.nivel === 'GERENTE_AREA') return 'Reemplazos de tu gerencia.';
    return 'Solicitudes de personal por aprobar.';
  }

  /**
   * Aviso de alcance: SOLO de dónde sale lo que el usuario ve. Lo que explicaba el flujo
   * ("tu aprobación es la obligatoria", "avanza recién con la de Gerencia General") se quitó
   * de acá: el modal de decisión ya lo marca con el chip «Obligatoria» y lo repite en la
   * confirmación al enviar, que es donde recién importa.
   *
   * El caso sin alcance sí conserva el porqué y qué hacer: la pantalla queda vacía a
   * propósito y sin ese texto se lee como un error.
   */
  get textoAlcance(): string {
    if (this.esGerenteGeneral) {
      return 'Apruebas las vacantes nuevas de toda la organización.';
    }
    if (this.esGth) {
      return 'Apruebas los reemplazos de toda la organización, junto con el gerente de cada área.';
    }
    if (this.nivel === 'GERENTE_AREA') {
      const area = this.areaAlcance ? this.areaAlcance : 'tu gerencia';
      return `Apruebas los reemplazos de ${area} y de las áreas que dependen de ella, junto con Gestión del Talento Humano.`;
    }
    return (
      'No hay solicitudes bajo tu alcance: tu ficha no es de Gerencia General, ni de gerente de ' +
      'área, ni del área de Gestión del Talento Humano. Pide a Gestión del Talento Humano que ' +
      'revise tu ficha.'
    );
  }

  // ── Textos de las tarjetas (dependen del nivel) ────────────────────────
  // Solo la etiqueta: la línea de apoyo que llevaban debajo ("Esperan tu decisión",
  // "Dentro de lo pendiente", "Ninguna vacante continuó") no agregaba nada al número y
  // dejaba las cuatro tarjetas con tres renglones de texto cada una.
  // Las tres firmas mandan igual desde el corte por tipo de requerimiento (la del área y la de
  // GTH ya no son un visto bueno: sin ellas el reemplazo no avanza), así que las etiquetas dejaron
  // de cambiar por nivel.
  get kpiPendientes(): string {
    return 'Por aprobar';
  }

  get kpiAprobadas(): string {
    return 'Aprobadas';
  }

  get kpiRechazadas(): string {
    return 'Rechazadas';
  }

  // ── Modal de decisión ──────────────────────────────────────────────────
  abrir(a: AprobacionListItem): void {
    this.detalleId = a.aprobacionId;
  }

  cerrarDetalle(): void {
    this.detalleId = null;
    // Si se llegó por el enlace del correo (`/aprobaciones/:id`), se limpia la URL
    // para que un refresco no vuelva a abrir el modal.
    if (this.route.snapshot.paramMap.get('id')) {
      this.router.navigate(['/gestion-gth/aprobaciones']);
      return;
    }
    this.cdr.detectChanges();
  }

  // ── Filtros ────────────────────────────────────────────────────────────
  get filtrosActivos(): number {
    return (this.searchText.trim() ? 1 : 0) + (this.estadoCodigo ? 1 : 0);
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.estadoCodigo = '';
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
    // Filtrar esconde filas: si la selección sobreviviera, una acción en bloque actuaría sobre
    // solicitudes que el usuario ya no tiene delante.
    this.selectedIds.clear();
    this.anclaSeleccion = null;
  }

  get filteredAprobaciones(): AprobacionListItem[] {
    const q = this.searchText.trim();
    const lista = this.aprobaciones.filter((a) => {
      // El filtro de estado va contra la casilla del usuario: es su decisión la que le
      // interesa rastrear, no la del otro nivel.
      if (this.estadoCodigo && this.miCasilla(a).estadoCodigo !== this.estadoCodigo) return false;
      if (!q) return true;
      return SearchInput.matches(
        [a.codigos, a.area, a.solicitanteNombre, this.miCasilla(a).estadoNombre]
          .filter(Boolean)
          .join(' '),
        q,
      );
    });

    // Orden de la columna elegida en la cabecera; por defecto, fecha de la más reciente a la más
    // antigua (ver defaultSortBy).
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return lista.sort((a, b) => {
      const va = this.valorOrden(a, this.sortBy);
      const vb = this.valorOrden(b, this.sortBy);
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'es', { sensitivity: 'base', numeric: true });
      // Desempate por id (lo más reciente primero) para que el orden sea estable: sin él, dos filas
      // con el mismo valor pueden intercambiarse en cada refresco de la vista.
      return cmp !== 0 ? cmp * dir : b.aprobacionId - a.aprobacionId;
    });
  }

  get mensajeVacio(): string {
    return this.filtrosActivos > 0
      ? 'Sin resultados para los filtros aplicados.'
      : 'Todavía no hay solicitudes de personal para aprobar.';
  }

  // ── Paginación (cliente) ───────────────────────────────────────────────
  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredAprobaciones);
  }

  get pagedAprobaciones(): AprobacionListItem[] {
    return this.pager.page(this.filteredAprobaciones);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Ordenamiento de columnas (cliente) ─────────────────────────────────
  /**
   * Orden por defecto: por fecha de envío, de la más reciente a la más antigua — el mismo criterio
   * que Gestión de Salidas con su fecha de salida.
   *
   * Antes la lista ponía primero lo que esperaba MI decisión y solo dentro de ese bloque ordenaba
   * por fecha. Ese agrupamiento se sacó porque ahora el orden es el de la columna que el usuario
   * elige, y lo pendiente se aísla mejor con lo que ya tiene la pantalla: el filtro «Pendiente de
   * decisión» o un clic en la columna de su propia casilla.
   */
  private readonly defaultSortBy = 'enviado';
  private readonly defaultSortDir: 'asc' | 'desc' = 'desc';

  sortBy: string = this.defaultSortBy;
  sortDir: 'asc' | 'desc' = this.defaultSortDir;

  /**
   * Cicla el orden de una columna: ascendente → descendente → vuelve al orden por defecto (fecha,
   * de la más reciente a la más antigua). La columna de fecha solo alterna desc ⇄ asc, porque
   * "volver al defecto" ya es su estado descendente.
   *
   * El orden se aplica sobre TODA la lista, no sobre la página visible, así que se vuelve a la
   * primera página: si no, la página 3 de un orden nuevo no significa nada.
   */
  toggleSort(column: string): void {
    if (this.sortBy !== column) {
      this.sortBy = column;
      this.sortDir = 'asc';
    } else if (this.sortDir === 'asc') {
      this.sortDir = 'desc';
    } else if (column === this.defaultSortBy) {
      this.sortDir = 'asc';
    } else {
      this.sortBy = this.defaultSortBy;
      this.sortDir = this.defaultSortDir;
    }
    this.pager.reset();
    // El ancla del rango es un índice dentro de la página: con otro orden ya no apunta a la misma fila.
    this.anclaSeleccion = null;
  }

  /** Dirección de orden activa para una columna (null si no se está ordenando por ella). */
  sortDirOf(column: string): 'asc' | 'desc' | null {
    return this.sortBy === column ? this.sortDir : null;
  }

  /** Valor con el que se compara cada columna ordenable. */
  private valorOrden(a: AprobacionListItem, column: string): string | number {
    switch (column) {
      case 'codigos':        return a.codigos ?? '';
      case 'area':           return a.area ?? '';
      case 'solicitante':    return a.solicitanteNombre ?? '';
      case 'vacantes':       return a.totalVacantes;
      // Una sola columna «Aprobaciones» que muestra las firmas que la solicitud necesita: se
      // ordena por la del propio usuario, que es la que le interesa rastrear.
      case 'aprobaciones':   return this.miCasilla(a).estadoNombre ?? '';
      // `enviado` viene en ISO, así que comparar el texto ya es comparar la fecha.
      default:               return a.enviado ?? '';
    }
  }

  // ── Selección de filas ─────────────────────────────────────────────────
  /**
   * Solicitudes marcadas (ids de aprobación). Se limpia al recargar y al cambiar los filtros —una
   * fila que dejó de estar visible no puede seguir contando para una acción en bloque—, pero
   * sobrevive al cambio de página y de orden: se puede juntar una selección de varias páginas antes
   * de decidir.
   */
  selectedIds = new Set<number>();

  /** Índice, dentro de la página visible, de la última fila clickeada: ancla del rango con Shift. */
  private anclaSeleccion: number | null = null;

  /**
   * Click en la casilla de una fila. Con Shift marca todo el rango entre la última fila clickeada y
   * la actual (como en Outlook); sin Shift alterna solo esa fila.
   */
  onSelectClick(event: MouseEvent, index: number): void {
    event.stopPropagation();
    const pagina = this.pagedAprobaciones;

    if (event.shiftKey && this.anclaSeleccion !== null) {
      // Evita que Shift+clic resalte el texto de las filas del rango.
      if (typeof window !== 'undefined') window.getSelection()?.removeAllRanges();
      const [desde, hasta] = [this.anclaSeleccion, index].sort((x, y) => x - y);
      for (let k = desde; k <= hasta; k++) {
        const fila = pagina[k];
        if (fila) this.selectedIds.add(fila.aprobacionId);
      }
      return; // el ancla se mantiene
    }

    const id = pagina[index]?.aprobacionId;
    if (id === undefined) return;
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else                          this.selectedIds.add(id);
    this.anclaSeleccion = index;
  }

  /** True si toda la página visible está marcada: es lo que alterna la casilla del encabezado. */
  get allSelected(): boolean {
    const pagina = this.pagedAprobaciones;
    return pagina.length > 0 && pagina.every((a) => this.selectedIds.has(a.aprobacionId));
  }

  /**
   * Marca o desmarca la página visible. Solo la página, no la lista completa: el encabezado está
   * arriba de esas filas y es lo que el usuario está viendo cuando lo clickea.
   */
  toggleSelectAll(): void {
    const pagina = this.pagedAprobaciones;
    const marcar = !this.allSelected;
    for (const a of pagina) {
      if (marcar) this.selectedIds.add(a.aprobacionId);
      else        this.selectedIds.delete(a.aprobacionId);
    }
    this.anclaSeleccion = null;
  }

  /** Seleccionadas que siguen visibles con los filtros actuales. */
  get selectedAprobaciones(): AprobacionListItem[] {
    return this.filteredAprobaciones.filter((a) => this.selectedIds.has(a.aprobacionId));
  }

  /**
   * Seleccionadas sobre las que este usuario todavía puede decidir: las que esperan SU casilla. Una
   * fila que su nivel ya decidió no se vuelve a decidir (el backend re-valida lo mismo), así que se
   * ignora en vez de bloquear la acción sobre las demás.
   */
  get selectedDecidibles(): AprobacionListItem[] {
    return this.selectedAprobaciones.filter((a) => a.esperaMiDecision);
  }

  /** Seleccionadas que ya llevan la decisión de este usuario: se dicen, para explicar el conteo. */
  get seleccionYaDecididas(): number {
    return this.selectedAprobaciones.length - this.selectedDecidibles.length;
  }

  /** Vacantes que abarca la selección decidible: la decisión en bloque aplica a TODAS ellas. */
  get vacantesSeleccionadas(): number {
    return this.selectedDecidibles.reduce((total, a) => total + a.totalVacantes, 0);
  }

  get puedeDecidirSeleccion(): boolean {
    return !this.decidiendo && this.selectedDecidibles.length > 0;
  }

  /** Por qué está deshabilitada la acción en bloque (null si está habilitada). */
  get motivoSinAccion(): string | null {
    if (this.selectedDecidibles.length > 0) return null;
    if (this.selectedAprobaciones.length > 0)
      return this.esGerenteGeneral
        ? 'Gerencia General ya decidió sobre las solicitudes seleccionadas.'
        : 'Ya registraste tu decisión en las solicitudes seleccionadas.';
    return 'Selecciona al menos una solicitud que espere tu decisión.';
  }

  // ── Decisión en bloque ─────────────────────────────────────────────────
  /** true mientras se envía una decisión en bloque (evita el doble envío). */
  decidiendo = false;

  /**
   * Las tres firmas aprueban de verdad: sin la del gerente del área el reemplazo no llega a GTH, y
   * sin la de GTH no llega a reclutamiento. Ninguna es ya un "visto bueno" que solo deja
   * constancia, así que las etiquetas no cambian por nivel.
   */
  get labelAprobar(): string {
    return 'Aprobar';
  }

  get labelRechazar(): string {
    return 'Rechazar';
  }

  aprobarSeleccion(): Promise<void> {
    return this.decidirSeleccion(true);
  }

  rechazarSeleccion(): Promise<void> {
    return this.decidirSeleccion(false);
  }

  /**
   * Registra la misma decisión sobre todas las solicitudes seleccionadas. Marcar una fila y aprobar
   * es aprobar TODAS sus vacantes —eso es lo que el usuario está eligiendo al decidir desde la
   * lista y no desde el modal—, así que la confirmación habla de solicitudes y de vacantes.
   *
   * El texto cambia según el nivel porque las decisiones no mueven lo mismo: la de Gerencia General
   * y la de GTH mandan las vacantes a reclutamiento, y la del gerente del área —la primera de las
   * dos firmas de un reemplazo— se las pasa a GTH para que ponga la segunda. Quién es quién no lo
   * decide esta pantalla: el backend lo resuelve desde la categoría de la ficha y re-valida fila
   * por fila.
   */
  private async decidirSeleccion(aprobar: boolean): Promise<void> {
    const items = this.selectedDecidibles;
    if (this.decidiendo || items.length === 0) return;

    const vacantes = this.vacantesSeleccionadas;
    const detalle = this.esGerenteGeneral || this.esGth
      ? aprobar
        ? `Se aprobarán las ${vacantes} vacante(s) de ${items.length} solicitud(es) y pasarán a Gestión de Talento Humano para iniciar el reclutamiento.`
        : `Ninguna de las ${vacantes} vacante(s) de ${items.length} solicitud(es) continuará y Gestión de Talento Humano no las recibirá.`
      : aprobar
        ? `Las ${vacantes} vacante(s) de ${items.length} solicitud(es) pasarán a Gestión de Talento Humano para su aprobación.`
        : `Ninguna de las ${vacantes} vacante(s) de ${items.length} solicitud(es) continuará: tu rechazo las cierra y no llegan a Gestión de Talento Humano.`;

    const confirm = await Swal.fire({
      title: aprobar ? `¿${this.labelAprobar} ${items.length} solicitud(es)?` : `¿${this.labelRechazar} ${items.length} solicitud(es)?`,
      html: detalle,
      icon: aprobar ? 'question' : 'warning',
      input: 'textarea',
      inputLabel: 'Comentario (opcional)',
      inputPlaceholder: aprobar ? 'Condiciones, observaciones...' : 'Motivo del rechazo...',
      inputAttributes: { 'aria-label': 'Comentario de la decisión' },
      showCancelButton: true,
      confirmButtonText: aprobar ? `Sí, ${this.labelAprobar.toLowerCase()}` : this.labelRechazar,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: aprobar ? '#64BC04' : '#D30000',
    });
    if (!confirm.isConfirmed) return;

    const comentario = typeof confirm.value === 'string' && confirm.value.trim() ? confirm.value.trim() : null;

    this.decidiendo = true;
    this.loaderService.show();
    this.service
      .decidirMasivo({
        aprobacionIds: items.map((a) => a.aprobacionId),
        aprobado: aprobar,
        comentario,
      })
      .subscribe({
        next: (res) => {
          this.decidiendo = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          Swal.fire({
            title: res.solicitudes > 0 ? 'Decisión registrada' : 'No se registró la decisión',
            html: res.message + this.detalleOmitidas(res.omitidas, items),
            icon: res.solicitudes === 0 ? 'warning' : res.omitidas.length > 0 ? 'info' : 'success',
            confirmButtonColor: 'var(--color-abril-logo-blue)',
          });
          // Los estados, los contadores y qué filas siguen esperando decisión los calcula el
          // backend: se recarga en vez de parchear la lista en memoria.
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.decidiendo = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          this.errorService.handleError(err);
        },
      });
  }

  /**
   * Lista de las solicitudes que quedaron fuera del lote, con su código. El motivo lo da el backend
   * y el código sale de la fila que el usuario tenía en pantalla: decir "2 omitidas" sin decir
   * cuáles obliga a buscarlas a mano en la lista recargada.
   */
  private detalleOmitidas(
    omitidas: AprobacionDecisionOmitida[],
    items: AprobacionListItem[],
  ): string {
    if (omitidas.length === 0) return '';

    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const filas = omitidas
      .map((o) => {
        const fila = items.find((i) => i.aprobacionId === o.aprobacionId);
        const etiqueta = fila?.codigos || `Solicitud #${o.aprobacionId}`;
        return `• <b>${esc(etiqueta)}</b>: ${esc(o.motivo)}`;
      })
      .join('<br>');

    return `<div style="margin-top:12px;text-align:left;font-size:12.5px;line-height:1.5;color:#78350F">${filas}</div>`;
  }

  // ── Presentación ───────────────────────────────────────────────────────
  readonly estadoColors = estadoAprobacionColors;

  /**
   * Resumen "3 de 4 aprobadas" bajo el total de vacantes, según la casilla del usuario; en las
   * que aún espera su decisión, solo cuántas le faltan por decidir.
   */
  detalleVacantes(a: AprobacionListItem): string {
    const mia = this.miCasilla(a);
    if (!mia.decidida) return `${a.totalVacantes} por decidir`;
    if (mia.vacantesRechazadas === 0) return `${mia.vacantesAprobadas} aprobadas`;
    if (mia.vacantesAprobadas === 0) return `${mia.vacantesRechazadas} rechazadas`;
    return `${mia.vacantesAprobadas} de ${a.totalVacantes} aprobadas`;
  }

  /** Texto del botón de la fila: decidir si le toca, consultar si ya pasó por ahí. */
  textoAccion(a: AprobacionListItem): string {
    return a.esperaMiDecision ? 'Revisar y aprobar' : 'Ver decisión';
  }
}
