import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Roles } from '../../../../core/constants/roles';
import { ProjectGetDTO } from '../../../../core/dtos/project/project.model';
import { TrabajadorHabService } from '../../services/trabajador-hab.service';
import { SharepointUploadService } from '../../services/sharepoint-upload.service';
import { EmpresaContratistaService } from '../../services/empresa-contratista.service';
import { EmpresaContratistaListDto } from '../../dtos/empresa.model';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import {
  ArchivoStagingDto,
  WorkerEntregableDto,
  WorkerEntregableUpdateDto,
  WorkerHabilitacionListDto,
  WorkerProyectoDto,
} from '../../dtos/trabajador.model';
import { environment } from '../../../../../environments/environment';
import { DocumentViewer } from '../../../../shared/components/document-viewer/document-viewer';
import { CambiarObra } from './components/cambiar-obra/cambiar-obra';
import { VersionesDoc } from './components/versiones-doc/versiones-doc';
import { ReingresoForm } from './components/reingreso-form/reingreso-form';
import { WorkerCreateEdit } from './components/worker-create-edit/worker-create-edit';
import { HistorialEventos } from './components/historial-eventos/historial-eventos';
import { AgregarProyecto } from './components/agregar-proyecto/agregar-proyecto';
import { ProgramarInduccion } from './components/programar-induccion/programar-induccion';
import { ProgramarEmoDialogComponent } from '../../../../shared/components/programar-emo-dialog/programar-emo-dialog';
import { EmoPorTrabajadorDto } from '../../../ssoma/salud-ocupacional/dtos/emo.model';
import { EmosProgramados } from './components/emos-programados/emos-programados';
import { InterconsultasPendientes } from './components/interconsultas-pendientes/interconsultas-pendientes';
import { SctrVidaLeyService } from '../../services/sctr-vidaley.service';
import { SctrVidaLeyDto } from '../../dtos/sctr.model';
import { CatalogosHabService } from '../../services/catalogos-hab.service';
import { AreaArbolNodoDto } from '../../dtos/catalogos.model';
import { getGerencias, getHijos } from '../../../../shared/utils/area-arbol.util';

@Component({
  selector: 'app-hab-trabajadores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Paginator,
    DocumentViewer,
    CambiarObra,
    VersionesDoc,
    ReingresoForm,
    HistorialEventos,
    AgregarProyecto,
    ProgramarInduccion,
    SearchSelect,
    SearchInput,
    FilterTriggerButton,
    FilterModal,
    WorkerCreateEdit,
    ProgramarEmoDialogComponent,
    EmosProgramados,
    InterconsultasPendientes,
  ],
  templateUrl: './trabajadores.html',
  styleUrl: './trabajadores.css',
})
export class Trabajadores implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly pageSize = 20;

  workers: WorkerHabilitacionListDto[] = [];
  selectedWorker: WorkerHabilitacionListDto | null = null;
  entregables: WorkerEntregableDto[] = [];
  selectedEntregable: WorkerEntregableDto | null = null;

  loading = false;
  loadingEntregables = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;

  search = '';
  filtroEstado = '';
  filtroContratistaCasa = '';
  filtroEmpresaId: number | null = null;
  filtroProyectoId: number | null = null;
  filtroGerenciaId: number | null = null;
  filtroAreaScopeId: number | null = null;
  soloRetirados = false;
  soloSinEmo = false;
  soloEmoVencido = false;
  soloSinVidaLey = false;
  /** Filtros de evidencia (SSOMA/Salud confidencial): solo filtran, no exponen datos clínicos en la tabla. */
  soloSinLectura = false;
  soloSinCertificado = false;
  soloSinInterconsulta = false;
  soloSinEmoCompleto = false;

  filtrosAbiertos = false;

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroEstado) n++;
    if (this.filtroEmpresaId) n++;
    if (this.filtroProyectoId) n++;
    if (this.filtroAreaEfectivo) n++;
    if (this.soloSinEmo) n++;
    if (this.soloEmoVencido) n++;
    if (this.soloSinVidaLey) n++;
    if (this.soloSinLectura) n++;
    if (this.soloSinCertificado) n++;
    if (this.soloSinInterconsulta) n++;
    if (this.soloSinEmoCompleto) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filtroEstado = '';
    this.filtroEmpresaId = null;
    this.filtroProyectoId = null;
    this.filtroGerenciaId = null;
    this.filtroAreaScopeId = null;
    this.areaScopeOptions = [];
    this.soloSinEmo = false;
    this.soloEmoVencido = false;
    this.soloSinVidaLey = false;
    this.soloSinLectura = false;
    this.soloSinCertificado = false;
    this.soloSinInterconsulta = false;
    this.soloSinEmoCompleto = false;
    this.loadWorkers(1);
  }

  catalogoProyectos: ProjectGetDTO[] = [];
  catalogoEmpresas: EmpresaContratistaListDto[] = [];
  areaArbolNodos: AreaArbolNodoDto[] = [];
  gerenciaOptions: AreaArbolNodoDto[] = [];
  areaScopeOptions: AreaArbolNodoDto[] = [];

  /** El id efectivo que se manda al backend: el área elegida, o si no hay, la gerencia. */
  get filtroAreaEfectivo(): number | null {
    return this.filtroAreaScopeId ?? this.filtroGerenciaId;
  }

  archivosPendientes: ArchivoStagingDto[] = [];
  panelVigencia = '';
  panelObsAbril = '';
  panelEstado = '';

  get uploadingFile(): boolean { return this.archivosPendientes.some(a => a.subiendo); }
  get panelArchivoUrl(): string { return this.archivosPendientes.find(a => a.path)?.path ?? ''; }

  get requiereVigenciaAnteUpload(): boolean {
    return !!this.selectedEntregable
      && this.selectedEntregable.requiereVigencia
      && this.panelEstado !== 'No Aplica';
  }

  get uploadBloqueadoPorVigencia(): boolean {
    return this.requiereVigenciaAnteUpload && !this.panelVigencia;
  }

  get puedeAprobarEntregableActual(): boolean {
    if (!this.selectedEntregable) return false;
    const resp = this.selectedEntregable.responsable?.toUpperCase() ?? '';
    if (resp === 'SSOMA')
      return this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA) ||
             this.authService.hasRole(Roles.ADMINISTRADOR_UDP);
    // El área de Calidad no tiene rol propio: aprueba con USUARIO_DE_ABRIL, el rol
    // genérico que ya tienen asignado (ver "Entrevista con el Área de Calidad").
    if (resp === 'CALIDAD')
      return this.authService.hasRole(Roles.USUARIO_DE_ABRIL) ||
             this.authService.hasRole(Roles.ADMINISTRADOR_UDP);
    if (resp === 'ADMINISTRACION')
      return this.authService.hasRole(Roles.ADMINISTRADOR_ADMINISTRACION) ||
             this.authService.hasRole(Roles.ADMINISTRADOR_UDP);
    return this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA) ||
           this.authService.hasRole(Roles.ADMINISTRADOR_ADMINISTRACION) ||
           this.authService.hasRole(Roles.ADMINISTRADOR_UDP);
  }

  drawerOpen = false;
  visorArchivoUrl = '';
  visorNombre = '';
  sctrPolizasWorker: SctrVidaLeyDto[] = [];
  loadingSctrPolizas = false;
  selectedIds: number[] = [];
  todosSeleccionados = false;
  modalCambiarObraOpen = false;
  modalVersionesOpen = false;
  versionesLoader = (id: number) => this.trabajadorHabService.getVersiones(id);
  modalWorkerOpen = false;
  modalWorkerMode: 'create' | 'edit' = 'create';
  workerParaEditar: WorkerHabilitacionListDto | null = null;
  mostrarReingreso = false;
  mostrarHistorial = false;
  mostrarAgregarProyecto = false;
  mostrarProgramarInduccion = false;
  mostrarProgramarEmo = false;
  workerParaProgramarEmo: WorkerHabilitacionListDto | null = null;
  mostrarEmosProgramados = false;
  mostrarInterconsultasPendientes = false;
  preselectedEmpresaId: number | null = null;
  workerParaAccion: WorkerHabilitacionListDto | null = null;
  workerParaReingreso: WorkerHabilitacionListDto | null = null;
  workerParaHistorial: WorkerHabilitacionListDto | null = null;
  workerSeleccionadoProyectos: WorkerProyectoDto[] = [];

  private searchChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private trabajadorHabService: TrabajadorHabService,
    private sharepointService: SharepointUploadService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private empresaContratistaService: EmpresaContratistaService,
    private sctrVidaLeyService: SctrVidaLeyService,
    private catalogosHabService: CatalogosHabService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.loadWorkers(1));

    // Deep-link desde el dashboard: /trabajadores?estado=No+Autorizado&contrataCasa=Casa&proyectoId=12
    const qp = this.route.snapshot.queryParamMap;
    const estado = qp.get('estado');
    const contrataCasa = qp.get('contrataCasa');
    const proyectoId = qp.get('proyectoId');
    const soloEmoVencido = qp.get('soloEmoVencido');
    if (estado) this.filtroEstado = estado;
    if (contrataCasa) this.filtroContratistaCasa = contrataCasa;
    if (proyectoId) this.filtroProyectoId = Number(proyectoId);
    if (soloEmoVencido === 'true') this.soloEmoVencido = true;

    this.loadWorkers(1);
    this.loadCatalogos();
  }

  private loadCatalogos(): void {
    console.log('[loadCatalogos] isContratista:', this.authService.isContratista(), 'roles:', this.authService.getRoles());
    const roles = this.authService.getRoles();
    const esContratista = this.authService.isContratista();
    console.log('[DIAG loadCatalogos] roles:', roles, '| esContratista:', esContratista);

    if (esContratista) {
      const empresaId = this.authService.getEmpresaId();
      console.log('[DIAG loadCatalogos] → rama CONTRATISTA | empresaId:', empresaId);
      if (empresaId) {
        this.empresaContratistaService.getProyectos(empresaId).subscribe({
          next: (res) => {
            this.catalogoProyectos = (res ?? []).map((p: any) => ({
              projectId: p.proyectoId,
              projectDescription: p.proyectoNombre,
            })) as unknown as ProjectGetDTO[];
            console.log('[DIAG loadCatalogos] CONTRATISTA proyectos:', this.catalogoProyectos.length);
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error('[DIAG loadCatalogos] CONTRATISTA getProyectos ERROR:', err?.status, err?.message);
            this.catalogoProyectos = [];
          },
        });
      }
      return;
    }

    console.log('[DIAG loadCatalogos] → rama CASA/ADMIN — llamando getProyectosActivos y getEmpresas');
    this.trabajadorHabService.getProyectosActivos().subscribe({
      next: (res) => {
        this.catalogoProyectos = (res ?? []).map(p => ({
          projectId: p.id,
          projectDescription: p.nombre,
        })) as unknown as ProjectGetDTO[];
        console.log('[DIAG loadCatalogos] getProyectosActivos OK — items:', this.catalogoProyectos.length);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('[DIAG loadCatalogos] getProyectosActivos ERROR:', err?.status, err?.message, err);
        this.catalogoProyectos = [];
      },
    });
    this.empresaContratistaService.getEmpresas({ soloContratistas: false, pageSize: 200 }).subscribe({
      next: (res) => {
        this.catalogoEmpresas = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.catalogoEmpresas = [];
      },
    });
    this.catalogosHabService.getAreaArbol().subscribe({
      next: (res) => {
        this.areaArbolNodos = res ?? [];
        this.gerenciaOptions = getGerencias(this.areaArbolNodos);
        this.cdr.detectChanges();
      },
      error: () => {
        this.areaArbolNodos = [];
        this.gerenciaOptions = [];
      },
    });
  }

  onGerenciaChange(id: number | null): void {
    this.filtroGerenciaId = id;
    this.filtroAreaScopeId = null;
    this.areaScopeOptions = id ? getHijos(this.areaArbolNodos, id) : [];
    this.onFilterChange();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWorkers(page: number = this.currentPage, afterLoad?: () => void): void {
    this.limpiarSeleccion();
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      search: this.search.trim() || undefined,
      estadoHabilitacion: this.filtroEstado || undefined,
      contratistaCasa: this.filtroContratistaCasa || undefined,
      empresaId: this.filtroEmpresaId ?? undefined,
      proyectoId: this.filtroProyectoId ?? undefined,
      areaScopeId: this.filtroAreaEfectivo ?? undefined,
      soloRetirados: this.soloRetirados || undefined,
      soloSinEmo: this.soloSinEmo || undefined,
      soloEmoVencido: this.soloEmoVencido || undefined,
      soloSinVidaLey: this.soloSinVidaLey || undefined,
      soloSinLectura: this.soloSinLectura || undefined,
      soloSinCertificado: this.soloSinCertificado || undefined,
      soloSinInterconsulta: this.soloSinInterconsulta || undefined,
      soloSinEmoCompleto: this.soloSinEmoCompleto || undefined,
    };
    console.log('[trabajadores] params:', JSON.stringify(params));
    this.trabajadorHabService.getTrabajadores(params).subscribe({
      next: (res) => {
        console.log('[trabajadores] total:', res.totalRecords, 'items:', res.data?.length);
        console.log('worker[0]:', res.data?.[0]);
        this.workers = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        this.loading = false;
        this.loaderService.hide();
        afterLoad?.();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private recargarWorkerEnLista(): void {
    const workerId = this.selectedWorker?.workerId ?? null;
    if (workerId === null) return;
    this.loadWorkers(this.currentPage, () => {
      const fresh = this.workers.find((w) => w.workerId === workerId);
      if (fresh) {
        this.selectedWorker = fresh;
        this.cdr.detectChanges();
      }
    });
  }

  actualizar(): void {
    const workerId = this.selectedWorker?.workerId ?? null;
    const entregableId = this.selectedEntregable?.id ?? null;

    this.loadWorkers(this.currentPage, () => {
      if (workerId !== null) {
        const fresh = this.workers.find((w) => w.workerId === workerId);
        if (fresh) {
          this.selectedWorker = fresh;
          this.cdr.detectChanges();
        }
      }
    });

    if (workerId !== null) {
      this.loadEntregables(workerId, () => {
        if (entregableId !== null) {
          const freshE = this.entregables.find((e) => e.id === entregableId);
          if (freshE) this.selectedEntregable = freshE;
        }
      });
      this.cargarProyectos(workerId);
    }
  }

  selectWorker(worker: WorkerHabilitacionListDto): void {
    this.selectedWorker = worker;
    this.selectedEntregable = null;
    this.resetPanel();
    this.loadEntregables(worker.workerId);
    this.cargarProyectos(worker.workerId);
  }

  cargarProyectos(workerId: number): void {
    this.trabajadorHabService.getProyectos(workerId).subscribe({
      next: (res) => {
        this.workerSeleccionadoProyectos = res ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.workerSeleccionadoProyectos = [];
        this.cdr.detectChanges();
      },
    });
  }

  abrirAgregarProyecto(worker: WorkerHabilitacionListDto): void {
    if (this.selectedWorker?.workerId !== worker.workerId) {
      this.selectWorker(worker);
    }
    this.mostrarAgregarProyecto = true;
  }

  onProyectoAgregado(_dto: WorkerProyectoDto): void {
    this.mostrarAgregarProyecto = false;
    if (this.selectedWorker) {
      this.cargarProyectos(this.selectedWorker.workerId);
    }
    this.loadWorkers(this.currentPage);
  }

  marcarInduccion(proyectoId: number): void {
    if (!this.selectedWorker) return;
    const workerId = this.selectedWorker.workerId;
    this.loaderService.show();
    this.trabajadorHabService.marcarInduccion(workerId, proyectoId).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Inducción registrada',
          timer: 1200,
          showConfirmButton: false,
        });
        this.cargarProyectos(workerId);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  loadEntregables(workerId: number, afterLoad?: () => void): void {
    this.loadingEntregables = true;
    this.entregables = [];
    this.trabajadorHabService.getEntregables(workerId).subscribe({
      next: (res) => {
        this.entregables = res ?? [];
        this.loadingEntregables = false;
        afterLoad?.();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingEntregables = false;
        this.errorService.handleError(err);
      },
    });
  }

  selectEntregable(e: WorkerEntregableDto): void {
    this.archivosPendientes = [];
    this.selectedEntregable = e;
    // En una renovación (estado "Renovando") se precarga la fecha propuesta por el contratista,
    // para que el aprobador la vea y la aplique al aprobar.
    const vigParaPanel = e.estado === 'Renovando' && e.vigenciaPropuesta ? e.vigenciaPropuesta : e.vigencia;
    this.panelVigencia = !e.requiereVigencia
      ? '2040-12-31'
      : (vigParaPanel ? vigParaPanel.substring(0, 10) : '');
    this.panelObsAbril = this.isContratista() ? (e.obsContratista ?? '') : (e.obsAbril ?? '');
    this.panelEstado = e.estado;
    this.drawerOpen = true;
    if ((e.itemId === 11 || e.itemId === 13) && this.selectedWorker) {
      this.cargarPolizasSctr(this.selectedWorker.workerId);
    } else {
      this.sctrPolizasWorker = [];
    }
  }

  private cargarPolizasSctr(workerId: number): void {
    this.loadingSctrPolizas = true;
    this.sctrPolizasWorker = [];
    this.sctrVidaLeyService.getPorTrabajador(workerId).subscribe({
      next: (res) => {
        // Guardamos todas; el filtro por tipo (SCTR vs VIDA_LEY) se aplica
        // en el getter polizasFiltradas segun el entregable abierto, para
        // no mezclar pólizas de un tipo dentro del modal del otro.
        this.sctrPolizasWorker = res ?? [];
        this.loadingSctrPolizas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingSctrPolizas = false;
        this.cdr.detectChanges();
      },
    });
  }

  get polizasFiltradas(): SctrVidaLeyDto[] {
    if (!this.selectedEntregable) return [];
    const tipoEsperado = this.selectedEntregable.itemId === 11 ? 'SCTR' : 'VIDA_LEY';
    return this.sctrPolizasWorker.filter((p) => p.tipo === tipoEsperado).slice(0, 3);
  }

  closeDrawer(): void {
    if (this.isContratista() && this.panelObsAbril !== (this.selectedEntregable?.obsContratista ?? '')) {
      this.guardarObservaciones();
    }
    this.drawerOpen = false;
    this.selectedEntregable = null;
    this.resetPanel();
  }


  private extractFileName(url: string): string {
    try {
      const parts = url.split(/[\\/]/);
      return parts[parts.length - 1] || url;
    } catch {
      return url;
    }
  }

  private resetPanel(): void {
    this.archivosPendientes = [];
    this.panelVigencia = '';
    this.panelObsAbril = '';
    this.panelEstado = '';
  }

  onSearch(): void {
    this.searchChange$.next();
  }

  onFilterChange(): void {
    this.loadWorkers(1);
  }

  /** A diferencia de los demás filtros, el proyecto se refleja en la URL para que se
   * mantenga al cambiar de pestaña (Dashboard/Empresa/Trabajadores comparten ?proyectoId=). */
  onProyectoFiltroChange(id: number | null): void {
    this.filtroProyectoId = id;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { proyectoId: id ?? null },
      queryParamsHandling: 'merge',
    });
    this.onFilterChange();
  }

  onPageChange(page: number): void {
    this.loadWorkers(page);
  }

  isContratista(): boolean {
    return this.authService.isContratista();
  }

  isAdmin(): boolean {
    return (
      this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA) ||
      this.authService.hasRole(Roles.ADMINISTRADOR_UDP) ||
      this.authService.hasRole(Roles.ADMINISTRADOR_ADMINISTRACION) ||
      this.authService.hasRole(Roles.USUARIO_GTH)
    );
  }

  isSSoma(): boolean {
    return this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA);
  }

  isAdministracion(): boolean {
    return this.authService.hasRole(Roles.ADMINISTRADOR_ADMINISTRACION);
  }

  esSoloLectura(e: WorkerEntregableDto | null): boolean {
    if (!e) return false;
    return (e.obsAbril ?? '').trim() === 'Gestionado por módulo SSOMA';
  }

  esSctrVidaley(e: WorkerEntregableDto | null): boolean {
    if (!e) return false;
    // Items 11 (SCTR trabajador) y 13 (Vida Ley trabajador) se gestionan directamente aquí
    if (e.itemId === 11 || e.itemId === 13) return false;
    return !!e.esSctrVidaley;
  }

  esEmo(e: WorkerEntregableDto): boolean {
    return e.nombreItem.toLowerCase().includes('emo');
  }

  workerEsCasa(): boolean {
    return this.selectedWorker?.contrataCasa === 'Casa';
  }

  esSoloLecturaPanel(e: WorkerEntregableDto): boolean {
    return this.esSctrVidaley(e) || this.esSoloLectura(e) || (this.esEmo(e) && this.workerEsCasa());
  }

  puedeEditar(_e: WorkerEntregableDto): boolean {
    return !this.isContratista();
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'Habilitado':
        return 'btn-chip chip-green';
      case 'Autorizado Temporalmente':
        return 'btn-chip chip-orange';
      case 'No Autorizado':
        return 'btn-chip chip-red';
      default:
        return 'btn-chip chip-gray';
    }
  }

  estaVencido(estado: string, vigencia?: string | null): boolean {
    // "Renovando" conserva la vigencia aprobada anterior; si esa ya venció, cuenta como vencido.
    if ((estado !== 'Aprobado' && estado !== 'Renovando') || !vigencia) return false;
    const vigenciaDate = new Date(vigencia);
    if (isNaN(vigenciaDate.getTime())) return false;
    return vigenciaDate.getTime() <= Date.now();
  }

  getEstadoLabel(estado: string, vigencia?: string | null): string {
    if (this.estaVencido(estado, vigencia)) return 'Vencido';
    if (estado === 'Renovando') return 'En Renovación';
    return estado;
  }

  getChipEstado(estado: string, vigencia?: string | null): string {
    if (this.estaVencido(estado, vigencia)) return 'chip-red';
    switch (estado) {
      case 'Aprobado':
        return 'chip-green';
      case 'Renovando':
        return 'chip-blue';
      case 'Enviado':
        return 'chip-orange';
      case 'Rechazado':
        return 'chip-orange';
      case 'No Aplica':
        return 'chip-gray';
      case 'Falta':
      default:
        return 'chip-gray';
    }
  }

  getDotClass(estado: string, vigencia?: string | null): string {
    if (this.estaVencido(estado, vigencia)) return 'dot-falta';
    const norm = (estado ?? '').toLowerCase();
    if (norm === 'aprobado') return 'dot-aprobado';
    if (norm === 'renovando') return 'dot-renovando';
    if (norm === 'falta' || norm === 'rechazado') return 'dot-falta';
    if (norm === 'enviado') return 'dot-enviado';
    if (norm === 'no aplica') return 'dot-no-aplica';
    return 'dot-no-aplica';
  }

  nombreArchivo(url: string): string {
    return url.split('/').pop()?.replace(/^\d{8}_/, '') ?? 'documento';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visorArchivoUrl) this.onVisorClosed();
    else if (this.drawerOpen) this.closeDrawer();
  }

  abrirVisor(archivoUrl: string): void {
    this.visorNombre = this.nombreArchivo(archivoUrl);
    this.visorArchivoUrl = archivoUrl;
  }

  onVisorClosed(): void {
    this.visorArchivoUrl = '';
  }

  abrirDocumento(archivoUrl: string): void {
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => window.open(res.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  descargarDocumento(archivoUrl: string): void {
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => {
        const a = document.createElement('a');
        a.href = res.url;
        a.download = this.nombreArchivo(archivoUrl);
        a.click();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private actualizarEntregableLocal(updates: Partial<WorkerEntregableDto>): void {
    if (!this.selectedEntregable) return;
    const idx = this.entregables.findIndex((e) => e.id === this.selectedEntregable!.id);
    if (idx !== -1) {
      this.entregables[idx] = { ...this.entregables[idx], ...updates };
      this.selectedEntregable = this.entregables[idx];
    }
    this.cdr.detectChanges();
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    console.log('[onFileSelected] files:', (event.target as HTMLInputElement)?.files?.length);
    const input = event.target as HTMLInputElement;
    const files = Array.from(input?.files ?? []);
    if (!files.length) return;
    input.value = '';

    for (const file of files) {
      const item: ArchivoStagingDto = {
        file, nombre: file.name, esZip: file.name.endsWith('.zip'),
        subiendo: false, error: false,
      };
      this.archivosPendientes.push(item);
    }
    this.cdr.detectChanges();
    // Forzar re-render del footer
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  private autoMarcarEnviado(): void {
    if (!this.selectedEntregable || !this.selectedWorker) return;

    const payload: WorkerEntregableUpdateDto = {
      estado: 'Enviado',
      archivoUrl: this.panelArchivoUrl || undefined,
      vigencia: this.panelVigencia || undefined,
      obsContratista: this.isContratista() ? this.panelObsAbril || undefined : undefined,
      obsAbril: !this.isContratista() ? this.panelObsAbril || undefined : undefined,
    };

    this.trabajadorHabService.updateEntregable(this.selectedEntregable.id, payload).subscribe({
      next: () => {
        this.actualizarEntregableLocal({
          estado: 'Enviado',
          archivoUrl: this.panelArchivoUrl || this.selectedEntregable?.archivoUrl,
          vigencia: this.panelVigencia || undefined,
        });
        this.panelEstado = 'Enviado';
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  guardarObservaciones(): void {
    if (!this.selectedEntregable) return;
    const id = this.selectedEntregable.id;
    const obs = this.panelObsAbril;
    this.trabajadorHabService
      .updateEntregable(id, { obsContratista: obs || undefined })
      .subscribe({
        next: () => {
          const e = this.entregables.find(x => x.id === id);
          if (e) e.obsContratista = obs;
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }

  clearArchivo(): void {
    this.archivosPendientes = [];
  }

  quitarArchivo(idx: number): void {
    this.archivosPendientes.splice(idx, 1);
    this.cdr.detectChanges();
  }

  enviarDocumento(): void {
    if (!this.selectedEntregable || !this.selectedWorker) return;
    if (this.archivosPendientes.length === 0) {
      Swal.fire({ icon: 'error', title: 'Debes adjuntar al menos un archivo' });
      return;
    }
    if (this.selectedEntregable.requiereVigencia && !this.panelVigencia) {
      Swal.fire({ icon: 'error', title: 'Debes ingresar la fecha de vigencia' });
      return;
    }
    if (this.panelVigencia) {
      const hoy = new Date().toISOString().substring(0, 10);
      if (this.panelVigencia <= hoy) {
        Swal.fire({ icon: 'error', title: 'La fecha de vigencia debe ser posterior a hoy' });
        return;
      }
    }

    const contexto = `habilitacion/trabajadores/${this.selectedWorker.workerId}`;
    const entregableId = this.selectedEntregable.id;

    this.archivosPendientes.forEach(a => a.subiendo = true);
    this.cdr.detectChanges();

    const subir = (idx: number): void => {
      if (idx >= this.archivosPendientes.length) {
        const archivos = this.archivosPendientes.map(a => ({
          archivoUrl: a.path!,
          nombreArchivo: a.nombre,
          esZip: a.esZip,
          zipContenido: a.zipContenido,
        }));
        this.sharepointService.enviarDocumento({
          habTrabajadorId: entregableId,
          vigencia: (this.isContratista() && this.selectedEntregable!.requiereVigencia)
            ? (this.panelVigencia || undefined)
            : (!this.isContratista() ? (this.panelVigencia || undefined) : undefined),
          obsContratista: this.isContratista() ? this.panelObsAbril || undefined : undefined,
          archivos,
        }).subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({ icon: 'success', title: 'Enviado', timer: 1500, showConfirmButton: false });
            this.archivosPendientes = [];
            this.actualizarEntregableLocal({
              estado: 'Enviado',
              vigencia: this.panelVigencia || undefined,
            });
            if (this.selectedWorker) this.loadEntregables(this.selectedWorker.workerId);
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
        return;
      }

      const item = this.archivosPendientes[idx];
      this.sharepointService.subirArchivoMultiple(item.file, contexto).subscribe({
        next: (res) => {
          item.path = res.path;
          item.esZip = res.esZip;
          item.zipContenido = res.zipContenido;
          item.subiendo = false;
          this.cdr.detectChanges();
          subir(idx + 1);
        },
        error: () => {
          item.error = true;
          item.subiendo = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          Swal.fire({ icon: 'error', title: `Error al subir ${item.nombre}` });
        },
      });
    };

    this.loaderService.show();
    subir(0);
  }

  guardarEntregable(): void {
    if (!this.selectedEntregable || !this.selectedWorker) return;

    // Si hay archivos pendientes (flujo multi-archivo) → usar enviarDocumento
    if (!this.isContratista() && this.archivosPendientes.length > 0) {
      this.enviarDocumento();
      return;
    }

    let payload: WorkerEntregableUpdateDto;

    if (this.isContratista()) {
      if (!this.panelArchivoUrl) {
        Swal.fire({ icon: 'error', title: 'Debes subir un archivo antes de guardar' });
        return;
      }
      if (this.selectedEntregable.requiereVigencia && !this.panelVigencia) {
        Swal.fire({ icon: 'error', title: 'Debes ingresar la fecha de vigencia' });
        return;
      }
      payload = {
        archivoUrl: this.panelArchivoUrl || undefined,
        vigencia: this.panelVigencia || undefined,
        obsContratista: this.panelObsAbril || undefined,
      };
    } else {
      const vigencia = (!this.selectedEntregable.requiereVigencia || this.panelEstado === 'No Aplica')
        ? '2040-12-31'
        : this.panelVigencia || undefined;
      payload = {
        estado: this.panelEstado,
        vigencia,
        obsAbril: this.panelObsAbril || undefined,
      };
    }

    this.loaderService.show();
    this.trabajadorHabService.updateEntregable(this.selectedEntregable.id, payload).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
        if (this.isContratista()) {
          this.actualizarEntregableLocal({
            archivoUrl: this.panelArchivoUrl || this.selectedEntregable?.archivoUrl,
            obsContratista: this.panelObsAbril || undefined,
          });
        } else {
          if (this.selectedWorker) this.loadEntregables(this.selectedWorker.workerId);
        }
        this.recargarWorkerEnLista();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  aprobarEntregable(): void {
    if (!this.selectedEntregable || !this.selectedWorker) return;

    Swal.fire({
      icon: 'question',
      title: '¿Aprobar entregable?',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.selectedWorker) return;
      this.loaderService.show();
      this.trabajadorHabService
        .updateEntregable(this.selectedEntregable.id, {
          estado: 'Aprobado',
          obsAbril: this.panelObsAbril || undefined,
          vigencia: this.panelVigencia || undefined,
        })
        .subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({
              icon: 'success',
              title: 'Aprobado',
              timer: 1500,
              showConfirmButton: false,
            });
            if (this.selectedWorker) this.loadEntregables(this.selectedWorker.workerId);
            this.recargarWorkerEnLista();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  rechazarEntregable(): void {
    if (!this.selectedEntregable || !this.selectedWorker) return;

    Swal.fire({
      icon: 'warning',
      title: 'Rechazar entregable',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      inputPlaceholder: 'Describe el motivo…',
      inputAttributes: { 'aria-label': 'Motivo del rechazo' },
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => (!value?.trim() ? 'Debes indicar un motivo' : null),
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.selectedWorker) return;
      this.loaderService.show();
      this.trabajadorHabService
        .updateEntregable(this.selectedEntregable.id, {
          estado: 'Rechazado',
          obsAbril: res.value,
        })
        .subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({
              icon: 'success',
              title: 'Rechazado',
              timer: 1500,
              showConfirmButton: false,
            });
            if (this.selectedWorker) this.loadEntregables(this.selectedWorker.workerId);
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  get haySeleccionados(): boolean {
    return this.selectedIds.length > 0;
  }

  abrirProgramarInduccion(): void {
    this.preselectedEmpresaId = this.authService.isContratista()
      ? (this.authService.getEmpresaId() ?? null)
      : null;
    this.mostrarProgramarInduccion = true;
  }

  limpiarSeleccion(): void {
    this.selectedIds = [];
    this.todosSeleccionados = false;
  }

  toggleSeleccion(id: number): void {
    if (this.selectedIds.includes(id)) {
      this.selectedIds = this.selectedIds.filter((x) => x !== id);
    } else {
      this.selectedIds = [...this.selectedIds, id];
    }
    const activos = this.workers.filter((w) => w.estadoWorker !== 'RETIRADO');
    this.todosSeleccionados =
      activos.length > 0 && activos.every((w) => this.selectedIds.includes(w.workerId));
    this.cdr.detectChanges();
  }

  toggleTodos(): void {
    const activos = this.workers.filter((w) => w.estadoWorker !== 'RETIRADO');
    if (this.todosSeleccionados) {
      this.selectedIds = [];
      this.todosSeleccionados = false;
    } else {
      this.selectedIds = activos.map((w) => w.workerId);
      this.todosSeleccionados = true;
    }
    this.cdr.detectChanges();
  }

  retirar(worker: WorkerHabilitacionListDto): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Dar de baja?',
      text: `Se dará de baja a ${worker.apellidoNombre}. Puede revertirse con Reingreso.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.trabajadorHabService.retirarWorker(worker.workerId).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Trabajador dado de baja',
            timer: 1500,
            showConfirmButton: false,
          });
          this.loadWorkers(this.currentPage);
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  retirarMasivo(): void {
    const n = this.selectedIds.length;
    Swal.fire({
      icon: 'warning',
      title: `¿Dar de baja a ${n} trabajador${n !== 1 ? 'es' : ''}?`,
      text: 'Esta acción puede revertirse individualmente con Reingreso.',
      showCancelButton: true,
      confirmButtonText: `Sí, dar de baja${n !== 1 ? ' a todos' : ''}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.trabajadorHabService.retirarWorkerMasivo([...this.selectedIds]).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: `${n} trabajador${n !== 1 ? 'es' : ''} dado${n !== 1 ? 's' : ''} de baja`,
            timer: 1500,
            showConfirmButton: false,
          });
          this.loadWorkers(this.currentPage);
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  verVersiones(): void {
    if (!this.selectedEntregable) return;
    this.modalVersionesOpen = true;
  }

  abrirCambiarObra(worker: WorkerHabilitacionListDto): void {
    this.workerParaAccion = worker;
    this.modalCambiarObraOpen = true;
  }

  abrirReingreso(worker: WorkerHabilitacionListDto): void {
    this.workerParaReingreso = worker;
    this.mostrarReingreso = true;
  }

  onReingresoSaved(): void {
    this.mostrarReingreso = false;
    this.workerParaReingreso = null;
    this.loadWorkers(this.currentPage);
  }

  abrirHistorial(worker: WorkerHabilitacionListDto): void {
    this.workerParaHistorial = worker;
    this.mostrarHistorial = true;
  }

  onCambiarObraSaved(): void {
    this.modalCambiarObraOpen = false;
    const prevId = this.workerParaAccion?.workerId ?? this.selectedWorker?.workerId ?? null;
    this.workerParaAccion = null;
    this.loadWorkers(this.currentPage, () => {
      if (prevId) {
        const updated = this.workers.find((w) => w.workerId === prevId);
        if (updated) this.selectWorker(updated);
      }
    });
  }

  closeCambiarObra(): void {
    this.modalCambiarObraOpen = false;
    this.workerParaAccion = null;
  }

  closeVersiones(): void {
    this.modalVersionesOpen = false;
  }

  abrirCrear(): void {
    this.modalWorkerMode = 'create';
    this.workerParaEditar = null;
    this.modalWorkerOpen = true;
  }

  abrirEditar(worker: WorkerHabilitacionListDto): void {
    this.modalWorkerMode = 'edit';
    this.workerParaEditar = worker;
    this.modalWorkerOpen = true;
  }

  onWorkerSaved(): void {
    this.modalWorkerOpen = false;
    this.workerParaEditar = null;
    this.loadWorkers(this.currentPage);
  }

  onBuscarWorker(dni: string): void {
    this.modalWorkerOpen = false;
    this.search = dni;
    this.loadWorkers(1);
  }

  abrirProgramarEmo(worker: WorkerHabilitacionListDto): void {
    this.workerParaProgramarEmo = worker;
    this.mostrarProgramarEmo = true;
  }

  /** Adapta el worker de la tabla de Habilitación al DTO que espera el diálogo compartido. */
  get workerParaProgramarEmoDto(): EmoPorTrabajadorDto | null {
    const w = this.workerParaProgramarEmo;
    if (!w) return null;
    return {
      workerId: w.workerId,
      nombreCompleto: w.apellidoNombre,
      dni: w.dni,
      empresaId: w.empresaId,
      empresa: w.empresaNombre,
      proyectoId: w.proyectoActualId,
      proyecto: w.proyectoActual,
      tieneEmo: !!w.tieneEmo,
      interconsultaEstado: w.interconsultaEstado ?? undefined,
      interconsultaEspecialidad: w.interconsultaEspecialidad ?? undefined,
    };
  }

  onProgramarEmoClosed(guardado: boolean): void {
    this.mostrarProgramarEmo = false;
    this.workerParaProgramarEmo = null;
    if (guardado) this.loadWorkers(this.currentPage);
  }

  abrirEmosProgramados(): void {
    this.mostrarEmosProgramados = true;
  }

  abrirInterconsultasPendientes(): void {
    this.mostrarInterconsultasPendientes = true;
  }

  emoProgLabel(estado: string): string {
    const map: Record<string, string> = {
      'Programado':           '📅 EMO Programado',
      'Aceptado por Clínica': '✅ Aceptado por Clínica',
      'En Atención':          '🏥 En Atención',
      'Interconsulta':        '🔄 Interconsulta Pendiente',
    };
    return map[estado] ?? estado;
  }
}
