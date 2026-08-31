import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  AbrilPageHeaderComponent,
  AbrilPageTab,
} from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AmonestacionService, EscuelitaService, EscuelitaItemDto, EscuelitaRegistrarRequest, RestringidosService, RestringidoListItemDto, RestringidoCreateRequest } from '../../services/amonestacion.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { Roles } from '../../../../../../core/constants/roles';
import {
  AmonCatalogoItem,
  AmonestacionDashboardDto,
  AmonestacionDetalleDto,
  AmonestacionListItemDto,
  AmonestacionListQuery,
  AmonFotoDto,
  WorkerPuntajeDto,
} from '../../dtos/amonestacion.dtos';
import { WorkerSearchService } from '../../../../salud-ocupacional/services/worker-search.service';
import { WorkerSearchItemDto } from '../../../../salud-ocupacional/dtos/worker-search.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';

type Tab = 'dashboard' | 'lista' | 'puntaje' | 'escuelita' | 'inhabilitados';

// Roles autorizados a ver la pestaña de inhabilitados. Se comparan por ID.
const ROLES_INHABILITACION: string[] = [
  Roles.ADMINISTRADOR_SSOMA, // JEFE SSOMA
  Roles.ADMINISTRADOR_DE_OBRA,
  Roles.COORDINADOR_SSOMA,
];

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-amonestaciones',
  standalone: true,
  imports: [
    FabButton,
    CommonModule,
    FormsModule,
    RouterModule,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    Paginator,
  ],
  templateUrl: './amonestaciones.html',
  styleUrl: './amonestaciones.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Amonestaciones implements OnInit {
  tab: Tab = 'dashboard';

  // ── Dashboard ─────────────────────────────────────────────────────
  dashboard: AmonestacionDashboardDto | null = null;
  loadingDashboard = false;

  // ── Lista ─────────────────────────────────────────────────────────
  lista: AmonestacionListItemDto[] = [];
  loadingLista = false;
  totalLista = 0;
  query: AmonestacionListQuery = { page: 1, pageSize: 20 };
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtroWorkerSearch = '';
  filtroEmpresa = '';
  filtroProyectoId: number | undefined;
  proyectos: AmonCatalogoItem[] = [];
  filtrosListaAbiertos = false;

  get filtrosListaActivos(): number {
    let n = 0;
    if (this.filtroWorkerSearch.trim()) n++;
    if (this.filtroEmpresa.trim()) n++;
    if (this.filtroProyectoId != null) n++;
    if (this.filtroFechaDesde) n++;
    if (this.filtroFechaHasta) n++;
    return n;
  }

  // ── Detalle / PDF inline / Cierre ─────────────────────────────────
  detalleVisible = false;
  detalle: AmonestacionDetalleDto | null = null;
  loadingDetalle = false;
  pdfBlobUrl: SafeResourceUrl | null = null;
  loadingPdf = false;
  private _blobObjectUrl: string | null = null;

  // Cierre
  cerrando = false;
  archivoFirmado: File | null = null;

  // Confirmar borrador
  confirmando = false;

  // ── Edición (corrección de errores — acceso restringido) ──────────
  editando = false;
  guardandoEdicion = false;
  editPuntos = 0;
  editDescripcion = '';
  editMotivoEdicion = '';

  get puedeEditarAmonestacion(): boolean {
    return (this.authService.getUserEmail() ?? '').toLowerCase() === 'sjustiniani@abril.pe';
  }

  abrirEdicion(): void {
    if (!this.detalle) return;
    this.editPuntos = this.detalle.puntosInfraccion;
    this.editDescripcion = this.detalle.descripcion;
    this.editMotivoEdicion = '';
    this.editando = true;
    this.cdr.markForCheck();
  }

  cancelarEdicion(): void {
    this.editando = false;
    this.cdr.markForCheck();
  }

  get puedeGuardarEdicion(): boolean {
    return !this.guardandoEdicion && this.editMotivoEdicion.trim().length >= 10;
  }

  guardarEdicion(): void {
    if (!this.detalle || !this.puedeGuardarEdicion) return;
    this.guardandoEdicion = true;
    this.cdr.markForCheck();
    this.svc.editar(this.detalle.id, {
      puntosInfraccion: this.editPuntos,
      descripcion: this.editDescripcion,
      motivoEdicion: this.editMotivoEdicion.trim(),
    }).subscribe({
      next: () => {
        this.guardandoEdicion = false;
        this.editando = false;
        this.verDetalle(this.detalle!.id);
        this.loadLista();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoEdicion = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Fotos inline en lista ─────────────────────────────────────────
  fotosCache = new Map<number, AmonFotoDto[]>();
  fotosExpandidoId: number | null = null;
  loadingFotosId: number | null = null;
  fotoLightbox: string | null = null;

  toggleFotosRow(id: number, event: Event): void {
    event.stopPropagation();
    if (this.fotosExpandidoId === id) {
      this.fotosExpandidoId = null;
      this.cdr.markForCheck();
      return;
    }
    if (this.fotosCache.has(id)) {
      this.fotosExpandidoId = id;
      this.cdr.markForCheck();
      return;
    }
    this.loadingFotosId = id;
    this.cdr.markForCheck();
    this.svc.getDetalle(id).subscribe({
      next: (d) => {
        this.fotosCache.set(id, d.fotos ?? []);
        this.fotosExpandidoId = id;
        this.loadingFotosId = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingFotosId = null;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Puntaje ───────────────────────────────────────────────────────
  puntajeQuery = '';
  puntajeResults: WorkerSearchItemDto[] = [];
  puntajeSearching = false;
  puntajeDto: WorkerPuntajeDto | null = null;
  loadingPuntaje = false;

  private puntajeQuery$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  readonly MESES = MESES;

  // ── Escuelita Abril ───────────────────────────────────────────────
  escuelitaWorkerQuery = '';
  escuelitaWorkerSelected: WorkerSearchItemDto | null = null;
  escuelitaWorkerResults: WorkerSearchItemDto[] = [];
  escuelitaSearching = false;
  escuelitaFecha = new Date().toISOString().split('T')[0];
  escuelitaPuntos = 1;
  escuelitaObs = '';
  escuelitaGuardando = false;
  escuelitaHistorial: EscuelitaItemDto[] = [];
  escuelitaLoadingHistorial = false;
  escuelitaPuntosNetos: number | null = null;
  private escuelitaQuery$ = new Subject<string>();

  // ── Inhabilitados ─────────────────────────────────────────────────
  inhabilitadosList: RestringidoListItemDto[] = [];
  loadingInhabilitados = false;
  inhabWorkerQuery = '';
  inhabWorkerSelected: WorkerSearchItemDto | null = null;
  inhabWorkerResults: WorkerSearchItemDto[] = [];
  inhabSearching = false;
  inhabMotivo = '';
  inhabGuardando = false;
  inhabDesbloqueandoId: number | null = null;
  inhabModoManual = false;
  inhabDniManual = '';
  inhabNombreManual = '';
  inhabFiltroLista = '';
  private inhabQuery$ = new Subject<string>();

  constructor(
    private svc: AmonestacionService,
    private escuelitaSvc: EscuelitaService,
    private inhabSvc: RestringidosService,
    private authService: AuthService,
    private workerSearch: WorkerSearchService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadInit();
    this.puntajeQuery$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => this.runPuntajeSearch(q));
    this.escuelitaQuery$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => this.runEscuelitaSearch(q));
    this.inhabQuery$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => this.runInhabSearch(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get puedeVerInhabilitados(): boolean {
    const roles = this.authService.getRoles();
    return ROLES_INHABILITACION.some(r => roles.includes(r));
  }

  get puedeBorrarInhabilitado(): boolean {
    return (this.authService.getUserEmail() ?? '').toLowerCase() === 'sjustiniani@abril.pe';
  }

  get inhabilitadosFiltrados(): RestringidoListItemDto[] {
    const q = this.inhabFiltroLista.trim().toLowerCase();
    if (!q) return this.inhabilitadosList;
    return this.inhabilitadosList.filter(i =>
      (i.apellidoNombre ?? '').toLowerCase().includes(q) ||
      (i.dni ?? '').toLowerCase().includes(q)
    );
  }

  get headerTabs(): AbrilPageTab[] {
    const tabs: AbrilPageTab[] = [
      { label: 'Dashboard',          icono: 'ti-chart-bar',   active: this.tab === 'dashboard' },
      { label: 'Ver amonestaciones',  icono: 'ti-list',        active: this.tab === 'lista' },
      { label: 'Puntaje trabajador',  icono: 'ti-user-check',  active: this.tab === 'puntaje' },
      { label: 'Escuelita Abril',     icono: 'ti-school',      active: this.tab === 'escuelita' },
    ];
    if (this.puedeVerInhabilitados) {
      tabs.push({ label: 'Inhabilitados', icono: 'ti-ban', active: this.tab === 'inhabilitados' });
    }
    return tabs;
  }

  onTabClick(t: AbrilPageTab): void {
    const map: Record<string, Tab> = {
      'Dashboard': 'dashboard',
      'Ver amonestaciones': 'lista',
      'Puntaje trabajador': 'puntaje',
      'Escuelita Abril': 'escuelita',
      'Inhabilitados': 'inhabilitados',
    };
    const key = map[t.label];
    if (key) this.setTab(key);
  }

  setTab(t: Tab): void {
    this.tab = t;
    if (t === 'dashboard' && !this.dashboard) this.loadDashboard();
    if (t === 'lista' && this.lista.length === 0) this.loadLista();
    if (t === 'inhabilitados') this.loadInhabilitados();
    this.cdr.markForCheck();
  }

  // ── Init (proyectos para filtro) ───────────────────────────────────

  private loadInit(): void {
    this.svc.getInit().subscribe({
      next: (init) => {
        this.proyectos = [...init.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  // ── Dashboard ─────────────────────────────────────────────────────

  loadDashboard(): void {
    this.loadingDashboard = true;
    this.svc.getDashboard().subscribe({
      next: (d) => {
        this.dashboard = d;
        this.loadingDashboard = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDashboard = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get tendenciaTexto(): string {
    if (!this.dashboard?.tendenciaMeses?.length) return '';
    const ultimos = this.dashboard.tendenciaMeses.filter(m => m.total > 0);
    if (!ultimos.length) return '';
    const last = ultimos[ultimos.length - 1];
    return `${MESES[last.mes]}: ${last.total}`;
  }

  // ── Lista ─────────────────────────────────────────────────────────

  loadLista(): void {
    this.loadingLista = true;
    const q: AmonestacionListQuery = {
      ...this.query,
      fechaDesde:    this.filtroFechaDesde || undefined,
      fechaHasta:    this.filtroFechaHasta || undefined,
      workerSearch:  this.filtroWorkerSearch.trim() || undefined,
      empresaNombre: this.filtroEmpresa.trim() || undefined,
      proyectoId:    this.filtroProyectoId,
    };
    this.svc.getLista(q).subscribe({
      next: (res) => {
        this.lista = res.items;
        this.totalLista = res.total;
        this.loadingLista = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingLista = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  filtrar(): void {
    this.query.page = 1;
    this.loadLista();
  }

  limpiarFiltros(): void {
    this.filtroWorkerSearch = '';
    this.filtroEmpresa = '';
    this.filtroProyectoId = undefined;
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.query.page = 1;
    this.loadLista();
  }

  cambiarPagina(p: number): void {
    this.query.page = p;
    this.loadLista();
  }

  get totalPaginas(): number {
    return Math.ceil(this.totalLista / (this.query.pageSize ?? 20));
  }

  // ── Detalle / PDF inline ───────────────────────────────────────────

  verDetalle(id: number): void {
    this._revokeBlobUrl();
    this.detalleVisible = true;
    this.detalle = null;
    this.pdfBlobUrl = null;
    this.loadingDetalle = true;
    this.editando = false;
    this.cdr.markForCheck();

    this.svc.getDetalle(id).subscribe({
      next: (d) => {
        this.detalle = d;
        this.loadingDetalle = false;
        this.cdr.markForCheck();
        // Siempre cargar el PDF desde el endpoint API (maneja redirect a SharePoint)
        this.loadingPdf = true;
        this.cdr.markForCheck();
        this.svc.getPdfBlob(id).subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            this._blobObjectUrl = url;
            this.pdfBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
            this.loadingPdf = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.loadingPdf = false;
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDetalle = false;
        this.detalleVisible = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cerrarDetalle(): void {
    this._revokeBlobUrl();
    this.detalleVisible = false;
    this.detalle = null;
    this.pdfBlobUrl = null;
    this.editando = false;
    this.cdr.markForCheck();
  }

  private _revokeBlobUrl(): void {
    if (this._blobObjectUrl) {
      URL.revokeObjectURL(this._blobObjectUrl);
      this._blobObjectUrl = null;
    }
  }

  get pdfSrc(): SafeResourceUrl | null {
    return this.pdfBlobUrl;
  }

  get pdfApiUrl(): string | null {
    if (!this.detalle) return null;
    return this.svc.getPdfUrl(this.detalle.id);
  }

  // ── Cierre ────────────────────────────────────────────────────────

  onArchivoFirmadoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoFirmado = input.files?.[0] ?? null;
  }

  confirmarAmonestacion(): void {
    if (!this.detalle || this.confirmando) return;
    this.confirmando = true;
    this.cdr.markForCheck();
    this.svc.confirmar(this.detalle.id).subscribe({
      next: () => {
        this.confirmando = false;
        this.detalle!.estado = 'Registrada';
        this.loadLista();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.confirmando = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cerrarAmonestacion(): void {
    if (!this.detalle || !this.archivoFirmado || this.cerrando) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.cerrando = true;
      this.cdr.markForCheck();

      this.svc.cerrar(this.detalle!.id, {
        documentoFirmadoBase64: base64,
        nombreArchivo: this.archivoFirmado!.name,
      }).subscribe({
        next: () => {
          this.cerrando = false;
          this.archivoFirmado = null;
          this.detalle!.estado = 'Cerrada';
          this.detalle!.fechaCierre = new Date().toISOString();
          // Refrescar lista para actualizar badge
          this.loadLista();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.cerrando = false;
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
    };
    reader.readAsDataURL(this.archivoFirmado);
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'Cerrada':        return 'estado-cerrada';
      case 'PendienteFirma': return 'estado-pendiente';
      case 'Borrador':       return 'estado-borrador';
      default:               return 'estado-registrada';
    }
  }

  estadoLabel(estado: string): string {
    switch (estado) {
      case 'Cerrada':        return 'Cerrada';
      case 'PendienteFirma': return 'Pendiente firma';
      case 'Borrador':       return 'Borrador';
      default:               return 'Registrada';
    }
  }

  safeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  abrirFoto(f: AmonFotoDto): void {
    this.fotoLightbox = this.fotoSrc(f);
    this.cdr.markForCheck();
  }

  cerrarLightbox(): void {
    this.fotoLightbox = null;
    this.cdr.markForCheck();
  }

  fotoSrc(f: AmonFotoDto): string {
    if (f.base64Data) {
      const b64 = f.base64Data.includes(',') ? f.base64Data : `data:image/jpeg;base64,${f.base64Data}`;
      return b64;
    }
    return f.url;
  }

  nivelColor(nivel: string): string {
    switch (nivel) {
      case 'CRITICO': return 'badge-critico';
      case 'ALTO':    return 'badge-alto';
      case 'MEDIO':   return 'badge-medio';
      default:        return 'badge-bajo';
    }
  }

  // ── Puntaje ───────────────────────────────────────────────────────

  onPuntajeQueryChange(value: string): void {
    this.puntajeQuery = value;
    this.puntajeDto = null;
    if (!value || value.trim().length < 2) {
      this.puntajeResults = [];
      return;
    }
    this.puntajeSearching = true;
    this.puntajeQuery$.next(value.trim());
  }

  private runPuntajeSearch(q: string): void {
    this.workerSearch.search(q).subscribe({
      next: (res) => {
        this.puntajeResults = res;
        this.puntajeSearching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.puntajeResults = [];
        this.puntajeSearching = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectPuntajeWorker(w: WorkerSearchItemDto): void {
    this.puntajeQuery = w.apellidoNombre;
    this.puntajeResults = [];
    this.loadingPuntaje = true;
    this.loaderService.show();
    this.svc.getPuntajeWorker(w.id).subscribe({
      next: (dto) => {
        this.puntajeDto = dto;
        this.loadingPuntaje = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPuntaje = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get puntajeBarWidth(): string {
    if (!this.puntajeDto) return '0%';
    return `${Math.min(100, (this.puntajeDto.puntosAcumulados / 10) * 100)}%`;
  }

  get puntajeBarColor(): string {
    if (!this.puntajeDto) return '#10b981';
    const p = this.puntajeDto.puntosAcumulados;
    if (p >= 10) return '#dc2626';
    if (p >= 7)  return '#f59e0b';
    if (p >= 4)  return '#f97316';
    return '#10b981';
  }

  readonly tendenciaAnio = new Date().getFullYear();

  get maxTendencia(): number {
    if (!this.dashboard?.tendenciaMeses?.length) return 1;
    return Math.max(...this.dashboard.tendenciaMeses.map((t) => t.total), 1);
  }

  // Tipos únicos para cabecera de matriz
  get tiposUnicos(): string[] {
    if (!this.dashboard) return [];
    return this.dashboard.porTipoSancion.map(t => t.tipoNombre);
  }

  // Proyectos únicos para leyenda de tendencia
  get proyectosUnicos(): string[] {
    if (!this.dashboard) return [];
    const set = new Set<string>();
    this.dashboard.tendenciaMeses.forEach(m => m.porProyecto.forEach(p => set.add(p.tipoNombre)));
    return Array.from(set);
  }

  totalPorProyectoEnMes(mes: import('../../dtos/amonestacion.dtos').AmonTendenciaMesDto, proyecto: string): number {
    return mes.porProyecto.find(p => p.tipoNombre === proyecto)?.total ?? 0;
  }

  totalPorTipoEnProyecto(proyecto: import('../../dtos/amonestacion.dtos').AmonMatrizProyectoDto, tipo: string): number {
    return proyecto.porTipo.find(t => t.tipoNombre === tipo)?.total ?? 0;
  }

  colorTipo(idx: number): string {
    const cols = ['#0d9488', '#1e3a5f', '#d97706', '#dc2626', '#7c3aed', '#059669'];
    return cols[idx % cols.length];
  }

  anchoBarra(total: number, proyecto: import('../../dtos/amonestacion.dtos').AmonMatrizProyectoDto): string {
    if (!this.dashboard?.totalAmonestaciones) return '0%';
    return `${Math.round((total / this.dashboard.totalAmonestaciones) * 100)}%`;
  }

  get paginas(): number[] {
    const total = this.totalPaginas;
    const current = this.query.page ?? 1;
    const pages: number[] = [];
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  // ── Escuelita Abril ───────────────────────────────────────────────

  onEscuelitaQueryChange(value: string): void {
    this.escuelitaWorkerQuery = value;
    this.escuelitaWorkerSelected = null;
    this.escuelitaHistorial = [];
    this.escuelitaPuntosNetos = null;
    if (!value || value.trim().length < 2) { this.escuelitaWorkerResults = []; return; }
    this.escuelitaSearching = true;
    this.escuelitaQuery$.next(value.trim());
  }

  private runEscuelitaSearch(q: string): void {
    this.workerSearch.search(q).subscribe({
      next: (res) => { this.escuelitaWorkerResults = res; this.escuelitaSearching = false; this.cdr.detectChanges(); },
      error: () => { this.escuelitaWorkerResults = []; this.escuelitaSearching = false; this.cdr.detectChanges(); },
    });
  }

  selectEscuelitaWorker(w: WorkerSearchItemDto): void {
    this.escuelitaWorkerSelected = w;
    this.escuelitaWorkerQuery = w.apellidoNombre;
    this.escuelitaWorkerResults = [];
    this.loadEscuelitaHistorial(w.id);
    this.cdr.markForCheck();
  }

  private loadEscuelitaHistorial(workerId: number): void {
    this.escuelitaLoadingHistorial = true;
    this.escuelitaSvc.getByWorker(workerId).subscribe({
      next: (items) => {
        this.escuelitaHistorial = items;
        this.escuelitaPuntosNetos = items[0]?.puntosNetos ?? null;
        this.escuelitaLoadingHistorial = false;
        this.cdr.markForCheck();
      },
      error: () => { this.escuelitaLoadingHistorial = false; this.cdr.markForCheck(); },
    });
  }

  get escuelitaCanSubmit(): boolean {
    return !!(this.escuelitaWorkerSelected && this.escuelitaPuntos > 0 && this.escuelitaFecha && !this.escuelitaGuardando);
  }

  registrarEscuelita(): void {
    if (!this.escuelitaCanSubmit) return;
    this.escuelitaGuardando = true;
    this.cdr.markForCheck();
    const req: EscuelitaRegistrarRequest = {
      workerId: this.escuelitaWorkerSelected!.id,
      fecha: this.escuelitaFecha,
      puntosDescontados: this.escuelitaPuntos,
      observaciones: this.escuelitaObs || undefined,
    };
    this.escuelitaSvc.registrar(req).subscribe({
      next: () => {
        this.escuelitaGuardando = false;
        this.escuelitaObs = '';
        this.escuelitaPuntos = 1;
        this.loadEscuelitaHistorial(this.escuelitaWorkerSelected!.id);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.escuelitaGuardando = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  escuelitaInhabColor(inhabilitado: boolean): string {
    return inhabilitado ? '#dc2626' : '#16a34a';
  }

  // ── Inhabilitados ─────────────────────────────────────────────────

  loadInhabilitados(): void {
    this.loadingInhabilitados = true;
    this.cdr.markForCheck();
    this.inhabSvc.getLista(false).subscribe({
      next: (list) => {
        this.inhabilitadosList = list;
        this.loadingInhabilitados = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingInhabilitados = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onInhabQueryChange(value: string): void {
    this.inhabWorkerQuery = value;
    this.inhabWorkerSelected = null;
    if (!value || value.trim().length < 2) { this.inhabWorkerResults = []; return; }
    this.inhabSearching = true;
    this.inhabQuery$.next(value.trim());
  }

  private runInhabSearch(q: string): void {
    this.workerSearch.search(q).subscribe({
      next: (res) => { this.inhabWorkerResults = res; this.inhabSearching = false; this.cdr.detectChanges(); },
      error: () => { this.inhabWorkerResults = []; this.inhabSearching = false; this.cdr.detectChanges(); },
    });
  }

  selectInhabWorker(w: WorkerSearchItemDto): void {
    this.inhabWorkerSelected = w;
    this.inhabWorkerQuery = w.apellidoNombre;
    this.inhabWorkerResults = [];
    this.cdr.markForCheck();
  }

  get inhabCanSubmit(): boolean {
    if (this.inhabGuardando) return false;
    if (!this.inhabMotivo.trim()) return false;
    if (this.inhabModoManual) return !!(this.inhabDniManual.trim() && this.inhabNombreManual.trim());
    return !!this.inhabWorkerSelected;
  }

  inhabilitarManual(): void {
    if (!this.inhabCanSubmit) return;
    this.inhabGuardando = true;
    this.cdr.markForCheck();

    let req: RestringidoCreateRequest;
    if (this.inhabModoManual) {
      req = {
        dni: this.inhabDniManual.trim(),
        apellidoNombre: this.inhabNombreManual.trim().toUpperCase(),
        motivo: this.inhabMotivo.trim(),
      };
    } else {
      const w = this.inhabWorkerSelected!;
      req = {
        workerId: w.id,
        dni: w.dni ?? undefined,
        apellidoNombre: w.apellidoNombre,
        motivo: this.inhabMotivo.trim(),
      };
    }

    this.inhabSvc.crear(req).subscribe({
      next: () => {
        this.inhabGuardando = false;
        this.inhabWorkerSelected = null;
        this.inhabWorkerQuery = '';
        this.inhabMotivo = '';
        this.inhabDniManual = '';
        this.inhabNombreManual = '';
        this.loadInhabilitados();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.inhabGuardando = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  desbloquearInhab(id: number): void {
    this.inhabDesbloqueandoId = id;
    this.cdr.markForCheck();
    this.inhabSvc.desactivar(id).subscribe({
      next: () => {
        this.inhabDesbloqueandoId = null;
        this.loadInhabilitados();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.inhabDesbloqueandoId = null;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Navegación ────────────────────────────────────────────────────

  nuevaAmonestacion(): void {
    this.router.navigate(['/ssoma/gestion/amonestaciones/nueva']);
  }
}
