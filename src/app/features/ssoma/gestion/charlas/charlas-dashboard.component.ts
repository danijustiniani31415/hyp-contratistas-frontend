import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef,
  Component, ElementRef, OnDestroy, OnInit, ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';
import { CharlasService } from './services/charlas.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { FindDiaPipe } from './pipes/find-dia.pipe';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { SharedFiltersService } from '../../../../shared/services/shared-filters.service';
import { AuthService } from '../../../../core/services/auth.service';
import { hoyIsoLocal, parseFechaLocal, toIsoLocal } from '../../../../shared/utils/fecha-local.util';
import { SecureImgDirective } from '../../../../shared/directives/secure-img.directive';
import {
  DashSupervisoresRow, Capacitacion, NuevaCharlaCreateDto,
  CharlaListItem, CharlaDetalle, UsuarioDto, Staff, CharlaGaleriaItem,
  DashPersonalResult, DashPersonalItem, DashDiaSemana,
} from './dtos/charlas.dtos';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { AbrilBulkActionDirective } from '../../../../shared/directives/abril-bulk-action.directive';
import { ClientPager } from '../../../../shared/utils/client-pager';
import { DEFAULT_PAGE_SIZE } from '../../../../shared/constants/pagination';

Chart.register(...registerables);

@Component({
  selector: 'app-charlas-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    SearchSelect,
    FindDiaPipe,
    SecureImgDirective,
    FilterTriggerButton,
    FilterModal,
    StatusBadge,
    Paginator,
    AbrilBulkActionDirective,
  ],
  templateUrl: './charlas-dashboard.component.html',
  styleUrl: './charlas-dashboard.component.css',
})
export class CharlasDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  activeTab = 1;
  loading = true;

  proyectos: { id: number; nombre: string }[] = [];
  proyectoId: number | undefined;
  mes = new Date().getMonth() + 1;
  anio = new Date().getFullYear();
  mesesData: any[] = [];
  aniosData: any[] = [];

  // ── Tab 1: Dashboard ──────────────────────────────────────────────────────────
  tab1Rows: DashSupervisoresRow[] = [];
  loadingTab1 = false;

  // Dashboard
  dashPersonalResult: DashPersonalResult = { dias: [], staff: [] };
  loadingDash = false;
  // La tabla staff x dias puede llegar a decenas de miles de celdas en proyectos grandes
  // (700+ trabajadores x 40+ dias de charla): renderizarla completa de una sola vez congela
  // el navegador por varios segundos. Se pagina el listado de staff igual que el resto de
  // tablas de la app.
  readonly dashPager = new ClientPager<DashPersonalItem>(DEFAULT_PAGE_SIZE);

  get dashStaffPagina(): DashPersonalItem[] {
    return this.dashPager.page(this.dashPersonalResult.staff);
  }

  get dashStaffTotalPages(): number {
    return this.dashPager.totalPages(this.dashPersonalResult.staff);
  }

  dashGoPage(p: number): void {
    this.dashPager.goTo(p);
    this.cdr.markForCheck();
  }

  // Editar charla (Tab 3): cabecera + asistencia
  editCharlaId: number | null = null;
  editForm = { titulo: '', tipo: '' as string, fecha: hoyIsoLocal() };
  editStaffChecks: Record<number, boolean> = {};
  savingEdit = false;

  // ── Tab 2: Capacitaciones ─────────────────────────────────────────────────────
  capacitaciones: Capacitacion[] = [];
  loadingTab2 = false;
  // modal nueva capacitacion
  showNuevaCapModal = false;
  subirFecha = new Date().toISOString().split('T')[0];
  subirTema = '';
  subirFiles: File[] = [];
  subirLoading = false;
  dragOver = false;
  // filtros tab 2
  tab2Estado = '';
  tab2Busqueda = '';
  // inline viewer
  viewerCapId: number | null = null;
  viewerArchivoIdx: Record<number, number> = {};

  // ── Tab 3: Nueva charla ───────────────────────────────────────────────────────
  staff: Staff[] = [];
  supervisores: UsuarioDto[] = [];
  charlaGaleria: CharlaGaleriaItem[] = [];
  loadingTab3 = false;
  showNuevaCharlaModal = false;
  readonly tiposCharla = ['Seguridad', 'Salud Ocupacional', 'Medio Ambiente'] as const;
  form = {
    titulo: '',
    tipo: 'Seguridad' as 'Seguridad' | 'Salud Ocupacional' | 'Medio Ambiente',
    fecha: hoyIsoLocal(),
    workerIds: [] as number[],
  };
  staffChecks: Record<number, boolean> = {};
  savingForm = false;

  // ── Tab 4: Lista y aprobación ─────────────────────────────────────────────────
  tab4Items: CharlaListItem[] = [];
  tab4Total = 0;
  tab4Page = 1;
  readonly tab4PageSize = 20;
  tab4Estado = '';
  loadingTab4 = false;
  charlaDetalle: CharlaDetalle | null = null;
  loadingDetalle = false;
  motivoRechazo = '';
  showRechazarForm = false;
  filtrosTab4Abiertos = false;
  filtrosGlobalesAbiertos = false;
  private readonly mesActual = new Date().getMonth() + 1;
  private readonly anioActual = new Date().getFullYear();

  get filtrosGlobalesActivos(): number {
    let n = 0;
    if (this.mes !== this.mesActual) n++;
    if (this.anio !== this.anioActual) n++;
    return n;
  }

  limpiarFiltrosGlobales(): void {
    this.mes = this.mesActual;
    this.anio = this.anioActual;
    this.loadTab1();
    this.loadTab2();
  }

  readonly tab2EstadoOpts = [
    { value: '', label: 'Todos los estados' },
    { value: 'Enviado', label: 'Enviado' },
    { value: 'Aprobado', label: 'Aprobado' },
    { value: 'Rechazado', label: 'Rechazado' },
  ];

  readonly tab4EstadoOpts = [
    { value: '', label: 'Todos los estados' },
    { value: 'Abierto', label: 'Abierto' },
    { value: 'Enviado', label: 'Enviado' },
    { value: 'Aprobado', label: 'Aprobado' },
    { value: 'Rechazado', label: 'Rechazado' },
  ];

  get filtrosTab4Activos(): number {
    return this.tab4Estado ? 1 : 0;
  }

  limpiarFiltrosTab4(): void {
    this.tab4Estado = '';
    this.tab4Page = 1;
    this.loadTab4();
  }

  readonly Math = Math;
  private chartInstance: Chart | null = null;

  constructor(
    private svc: CharlasService,
    private filters: SharedFiltersService,
    private loader: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    public auth: AuthService,
  ) {}

  get puedeAprobar(): boolean {
    return this.auth.hasFeature('ssoma.charlas.aprobar');
  }

  get tabsHeader() {
    const base = [
      { label: 'Dashboard', icono: 'ti-chart-bar', route: '/ssoma/gestion/charlas/dashboard' },
      { label: 'Charlas Realizadas por Staff', icono: 'ti-users', route: '/ssoma/gestion/charlas/capacitaciones' },
      { label: 'Registro de Asistencia', icono: 'ti-plus', route: '/ssoma/gestion/charlas/nueva' },
      { label: 'Gestión', icono: 'ti-clipboard-check', route: '/ssoma/gestion/charlas/gestion' },
    ];
    if (this.puedeAprobar) {
      base.push({ label: 'Revisión Contratistas', icono: 'ti-building', route: '/ssoma/gestion/charlas/revision-contratista' });
    }
    return base;
  }

  ngOnInit(): void {
    this.activeTab = this.route.snapshot.data['tab'] ?? 1;

    forkJoin({
      miProyecto: this.svc.getMiProyecto().pipe(catchError(() => of(null))),
      proyectos: this.filters.getProyectos().pipe(catchError(() => of([]))),
      supervisores: this.svc.getSupervisores().pipe(catchError(() => of([]))),
      meses: this.filters.getMeses().pipe(catchError(() => of([]))),
      anios: this.filters.getAnios().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ miProyecto, proyectos, supervisores, meses, anios }) => {
        this.proyectos = proyectos as any[];
        this.mesesData = meses as any[];
        this.aniosData = anios as any[];
        this.supervisores = supervisores as any[];
        this.loading = false;
        this.cdr.markForCheck();

        // Si ya elegimos un proyecto antes en esta sesión (ej. el usuario cambió de pestaña
        // dentro de Charlas), lo reusamos directo en vez de repetir la búsqueda completa.
        if (this.svc.ultimoProyectoId != null) {
          this.proyectoId = this.svc.ultimoProyectoId;
          this.loadAll();
          return;
        }

        const miProyectoId = miProyecto ? (miProyecto as any).proyectoId : undefined;
        const candidatos = [miProyectoId, ...this.proyectos.map(p => p.id)]
          .filter((id, i, arr) => id != null && arr.indexOf(id) === i);
        if (candidatos.length) this.elegirPrimerProyectoConDatos(candidatos, 0);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Prueba "mi proyecto" primero y, si no tiene charlas para el mes actual, recorre el resto
   * de proyectos en orden hasta encontrar el primero con datos — para no arrancar el dashboard
   * en un proyecto vacío. Se ejecuta solo en la carga inicial; un cambio manual del combo
   * Proyecto usa onProyectoChange() normal, sin este fallback.
   */
  private elegirPrimerProyectoConDatos(candidatos: number[], i: number): void {
    const id = candidatos[i];
    this.svc.getDashPersonal(id, this.mes, this.anio).pipe(catchError(() => of({ dias: [], staff: [] }))).subscribe({
      next: (d) => {
        const esUltimo = i === candidatos.length - 1;
        if (d.staff.length > 0 || esUltimo) {
          this.proyectoId = id;
          this.svc.ultimoProyectoId = id;
          this.dashPersonalResult = d;
          this.dashPager.reset();
          this.cdr.markForCheck();
          this.loadAll();
        } else {
          this.elegirPrimerProyectoConDatos(candidatos, i + 1);
        }
      },
    });
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
  }

  setTab(n: number): void {
    this.activeTab = n;
    this.cdr.markForCheck();
    if (n === 1 && !this.tab1Rows.length) this.loadTab1();
    if (n === 2) this.loadTab2();
    if (n === 3 && this.proyectoId) this.loadTab3();
    if (n === 4 && !this.tab4Items.length) this.loadTab4();
  }

  onProyectoChange(): void {
    if (!this.proyectoId) return;
    this.svc.ultimoProyectoId = this.proyectoId;
    this.loadAll();
    if (this.activeTab === 3) this.loadTab3();
  }

  loadAll(): void {
    this.loadTab1();
    this.loadTab4();
    if (this.activeTab === 2) this.loadTab2();
    if (this.activeTab === 3) this.loadTab3();
  }

  // ── Tab 1 ──────────────────────────────────────────────────────────────────────
  loadTab1(): void {
    this.loadDash();
  }

  loadDash(): void {
    if (!this.proyectoId) return;
    this.loadingDash = true;
    this.cdr.markForCheck();
    this.svc.getDashPersonal(this.proyectoId, this.mes, this.anio).subscribe({
      next: (d) => { this.dashPersonalResult = d; this.dashPager.reset(); this.loadingDash = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingDash = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  abrirEditCharla(charla: CharlaGaleriaItem): void {
    this.editCharlaId = charla.id;
    const fecha = parseFechaLocal(charla.fecha);
    this.editForm = {
      titulo: charla.titulo,
      tipo: charla.tipo,
      fecha: fecha ? toIsoLocal(fecha) : hoyIsoLocal(),
    };
    this.editStaffChecks = {};
    this.savingEdit = false;
    // Pre-cargar asistencia actual
    this.svc.getAsistencia(charla.id).subscribe({
      next: (list) => {
        list.forEach(a => { if (a.asistio) this.editStaffChecks[a.workerId] = true; });
        this.cdr.markForCheck();
      },
    });
    this.cdr.markForCheck();
  }

  cerrarEditCharla(): void {
    this.editCharlaId = null;
    this.cdr.markForCheck();
  }

  toggleEditStaff(workerId: number): void {
    this.editStaffChecks[workerId] = !this.editStaffChecks[workerId];
    this.cdr.markForCheck();
  }

  countEditChecked(): number {
    return Object.values(this.editStaffChecks).filter(Boolean).length;
  }

  seleccionarTodosEdit(): void {
    const allChecked = this.staff.every(s => this.editStaffChecks[s.workerId]);
    this.staff.forEach(s => { this.editStaffChecks[s.workerId] = !allChecked; });
    this.cdr.markForCheck();
  }

  guardarEditCharla(): void {
    if (!this.editCharlaId || !this.editForm.titulo.trim() || !this.editForm.fecha) return;
    const workerIds = Object.entries(this.editStaffChecks).filter(([, v]) => v).map(([k]) => Number(k));
    const fecha = this.editForm.fecha;
    this.savingEdit = true;
    this.cdr.markForCheck();
    this.svc.editarCharla(this.editCharlaId, {
      titulo: this.editForm.titulo.trim(),
      tema: this.editForm.tipo,
      fecha,
      workerIds,
    }).subscribe({
      next: () => {
        this.savingEdit = false;
        this.cerrarEditCharla();
        this.loadTab3();
        // La galería solo trae el mes filtrado: si la fecha se movió fuera de él, la charla
        // desaparece de la lista y conviene decirlo en vez de dejar que parezca un error.
        const d = parseFechaLocal(fecha);
        const fueraDelFiltro = !!d && (d.getMonth() + 1 !== this.mes || d.getFullYear() !== this.anio);
        Swal.fire({
          icon: 'success',
          title: 'Charla actualizada',
          text: fueraDelFiltro
            ? `La nueva fecha está fuera de ${this.mesLabel()} ${this.anio}, así que la charla ya no aparece en esta lista.`
            : undefined,
          timer: fueraDelFiltro ? undefined : 1500,
          showConfirmButton: fueraDelFiltro,
        });
      },
      error: (err: HttpErrorResponse) => { this.savingEdit = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  pctClass(pct: number): string {
    if (pct >= 80) return 'pct-alto';
    if (pct >= 50) return 'pct-medio';
    return 'pct-bajo';
  }

  getPct(r: DashSupervisoresRow): number {
    return r.totalAsistentes > 0 ? Math.round(r.totalAsistio / r.totalAsistentes * 100) : 0;
  }

  // ── Tab 2 ──────────────────────────────────────────────────────────────────────
  loadTab2(): void {
    if (!this.proyectoId) return;
    this.loadingTab2 = true;
    this.svc.getCapacitaciones(this.proyectoId, this.mes || undefined, this.anio || undefined).subscribe({
      next: (data) => {
        this.capacitaciones = data.filter(c => c.estado !== 'Falta');
        this.loadingTab2 = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.loadingTab2 = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get capacitacionesFiltradas() {
    return this.capacitaciones.filter(c => {
      const porEstado = !this.tab2Estado || c.estado === this.tab2Estado;
      const porNombre = !this.tab2Busqueda || c.nombreCompleto.toLowerCase().includes(this.tab2Busqueda.toLowerCase());
      return porEstado && porNombre;
    });
  }

  abrirNuevaCapModal(): void {
    this.subirFecha = new Date().toISOString().split('T')[0];
    this.subirTema = '';
    this.subirFiles = [];
    this.dragOver = false;
    this.showNuevaCapModal = true;
    this.cdr.markForCheck();
  }

  cerrarNuevaCapModal(): void {
    this.showNuevaCapModal = false;
    this.cdr.markForCheck();
  }

  toggleViewer(id: number | null): void {
    this.viewerCapId = this.viewerCapId === id ? null : id;
    this.cdr.markForCheck();
  }

  onSubirFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
    this.cdr.markForCheck();
  }

  onDragLeave(): void {
    this.dragOver = false;
    this.cdr.markForCheck();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    if (event.dataTransfer?.files.length) this.addFiles(Array.from(event.dataTransfer.files));
    this.cdr.markForCheck();
  }

  addFiles(files: File[]): void {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    files.forEach(f => {
      if (allowed.includes(f.type) && !this.subirFiles.find(x => x.name === f.name && x.size === f.size))
        this.subirFiles.push(f);
    });
    this.cdr.markForCheck();
  }

  removeFile(i: number): void {
    this.subirFiles.splice(i, 1);
    this.cdr.markForCheck();
  }

  subirEvidencia(): void {
    if (!this.subirFecha || !this.subirTema || !this.subirFiles.length) {
      Swal.fire({ icon: 'warning', title: 'Completa todos los campos', timer: 2000, showConfirmButton: false });
      return;
    }
    this.subirLoading = true;
    this.cdr.markForCheck();
    this.svc.subirCapacitacionMulti(this.subirFecha, this.subirTema, this.subirFiles).subscribe({
      next: () => {
        this.subirLoading = false;
        this.showNuevaCapModal = false;
        this.subirTema = ''; this.subirFiles = [];
        this.loadTab2();
        Swal.fire({ icon: 'success', title: 'Capacitación registrada', timer: 1500, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.subirLoading = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  getArchivoIdx(capId: number): number {
    return this.viewerArchivoIdx[capId] ?? 0;
  }

  setArchivoIdx(capId: number, idx: number): void {
    this.viewerArchivoIdx[capId] = idx;
    this.cdr.markForCheck();
  }

  capEstadoClass(e: string): string {
    const map: Record<string, string> = { Falta: 'badge--naranja', Enviado: 'badge--azul', Aprobado: 'badge--verde', Rechazado: 'badge--rojo' };
    return map[e] ?? 'badge--gris';
  }

  aprobarCapacitacion(c: Capacitacion): void {
    if (!c.id) return;
    this.loader.show();
    this.svc.cambiarEstado(c.id, 'Aprobado').subscribe({
      next: () => {
        this.loader.hide();
        this.loadTab2();
        Swal.fire({ icon: 'success', title: 'Capacitación aprobada', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => { this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  async rechazarCapacitacion(c: Capacitacion): Promise<void> {
    if (!c.id) return;
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: 'Rechazar capacitación',
      text: '¿Confirmas rechazar esta capacitación?',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;
    this.loader.show();
    this.svc.cambiarEstado(c.id, 'Rechazado').subscribe({
      next: () => {
        this.loader.hide();
        this.loadTab2();
        Swal.fire({ icon: 'info', title: 'Capacitación rechazada', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => { this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  // ── Tab 3 ──────────────────────────────────────────────────────────────────────
  loadTab3(): void {
    if (!this.proyectoId) return;
    this.loadingTab3 = true;
    forkJoin({
      galeria: this.svc.getCharlasProyecto(this.proyectoId, this.mes, this.anio).pipe(catchError(() => of([]))),
      staff: this.svc.getStaff(this.proyectoId).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ galeria, staff }) => {
        this.charlaGaleria = galeria as CharlaGaleriaItem[];
        this.staff = staff as Staff[];
        this.loadingTab3 = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingTab3 = false; this.cdr.markForCheck(); },
    });
  }

  abrirNuevaCharlaModal(): void {
    this.form = { titulo: '', tipo: 'Seguridad', fecha: hoyIsoLocal(), workerIds: [] };
    this.staffChecks = {};
    this.showNuevaCharlaModal = true;
    this.cdr.markForCheck();
  }

  cerrarNuevaCharlaModal(): void {
    this.showNuevaCharlaModal = false;
    this.cdr.markForCheck();
  }

  toggleStaff(workerId: number): void {
    this.staffChecks[workerId] = !this.staffChecks[workerId];
    this.form.workerIds = Object.entries(this.staffChecks).filter(([, v]) => v).map(([k]) => Number(k));
  }

  seleccionarTodosNueva(): void {
    const allChecked = this.staff.every(s => this.staffChecks[s.workerId]);
    this.staff.forEach(s => { this.staffChecks[s.workerId] = !allChecked; });
    this.form.workerIds = allChecked ? [] : this.staff.map(s => s.workerId);
  }

  submitCrear(): void {
    if (!this.proyectoId || !this.form.titulo || !this.form.fecha) return;
    const dto: NuevaCharlaCreateDto = {
      proyectoId: this.proyectoId,
      titulo: this.form.titulo,
      tema: this.form.tipo,
      fecha: this.form.fecha,
      duracionHoras: 1,
      workerIds: this.form.workerIds,
    };
    this.savingForm = true;
    this.svc.crearNuevaCharla(dto).subscribe({
      next: () => {
        this.savingForm = false;
        this.showNuevaCharlaModal = false;
        this.loadTab3();
        Swal.fire({ icon: 'success', title: 'Charla registrada', timer: 1800, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.savingForm = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  tipoClass(tipo: string): string {
    if (tipo === 'Salud Ocupacional') return 'tipo--salud';
    if (tipo === 'Medio Ambiente') return 'tipo--ambiente';
    return 'tipo--seguridad';
  }

  // ── Tab 4 ──────────────────────────────────────────────────────────────────────
  loadTab4(): void {
    this.loadingTab4 = true;
    this.svc.getLista(this.proyectoId, this.tab4Estado || undefined, this.tab4Page, this.tab4PageSize).subscribe({
      next: (r) => { this.tab4Items = r.items; this.tab4Total = r.total; this.loadingTab4 = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingTab4 = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  get tab4TotalPages(): number { return Math.ceil(this.tab4Total / this.tab4PageSize); }

  get miProyectoNombre(): string {
    return this.proyectos.find(p => p.id === this.proyectoId)?.nombre ?? 'Mi proyecto';
  }

  tab4GoPage(p: number): void {
    if (p < 1 || p > this.tab4TotalPages) return;
    this.tab4Page = p;
    this.loadTab4();
  }

  abrirDetalle(item: CharlaListItem): void {
    this.charlaDetalle = null;
    this.showRechazarForm = false;
    this.motivoRechazo = '';
    this.loadingDetalle = true;
    this.cdr.markForCheck();
    this.svc.getDetalle(item.id).subscribe({
      next: (d) => { this.charlaDetalle = d; this.loadingDetalle = false; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loadingDetalle = false; this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  cerrarDetalle(): void {
    this.charlaDetalle = null;
    this.loadingDetalle = false;
    this.showRechazarForm = false;
    this.motivoRechazo = '';
    this.cdr.markForCheck();
  }

  aprobar(): void {
    if (!this.charlaDetalle) return;
    this.loader.show();
    this.svc.aprobar(this.charlaDetalle.id).subscribe({
      next: () => {
        this.loader.hide();
        this.cerrarDetalle();
        this.loadTab4();
        Swal.fire({ icon: 'success', title: 'Aprobado', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => { this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  rechazar(): void {
    if (!this.charlaDetalle || !this.motivoRechazo.trim()) return;
    this.loader.show();
    this.svc.rechazar(this.charlaDetalle.id, this.motivoRechazo.trim()).subscribe({
      next: () => {
        this.loader.hide();
        this.cerrarDetalle();
        this.loadTab4();
        Swal.fire({ icon: 'info', title: 'Rechazado', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => { this.loader.hide(); this.errorService.handleError(err); this.cdr.markForCheck(); },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────────
  estadoClass(estado: string): string {
    const map: Record<string, string> = { Aprobado: 'badge--verde', Rechazado: 'badge--rojo', Enviado: 'badge--azul', Abierto: 'badge--naranja' };
    return map[estado] ?? 'badge--gris';
  }

  formatFecha(f: string | null | undefined): string {
    const d = parseFechaLocal(f);
    if (d === null) return '—';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  isPdf(url: string | null | undefined): boolean { return !!url && url.toLowerCase().includes('.pdf'); }

  safeUrl(url: string): SafeResourceUrl { return this.sanitizer.bypassSecurityTrustResourceUrl(url); }

  mesLabel(): string { return this.mesesData.find(m => m.id == this.mes)?.nombre ?? ''; }
}
