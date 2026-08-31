import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { EmoService } from '../services/emo.service';
import { CatalogosSaludService } from '../services/catalogos-salud.service';
import { SharedFiltersService, SelectOption } from '../../../../shared/services/shared-filters.service';
import { EmoPorTrabajadorDto, EmoPorTrabajadorQuery } from '../dtos/emo.model';
import { EmpresaSimpleDto } from '../dtos/catalogos.model';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import {
  aptitudBadgeClass,
  APTITUD_CHART_ORDER,
} from '../shared/aptitud.utils';
import {
  diasVencerBadgeClass,
  diasVencerStyle,
} from '../shared/dias-vencer.utils';
import { EmoCreate } from './components/emo-create/emo-create';
import { EmoDetail } from './components/emo-detail/emo-detail';
import { FabButton } from '../../../../shared/components/fab-button/fab-button';
import { ProgramarEmoDialogComponent } from '../../../../shared/components/programar-emo-dialog/programar-emo-dialog';
import { EditarEmoModal } from '../../../../shared/components/editar-emo-modal/editar-emo-modal';
import { DocumentosEmoModal } from '../../../../shared/components/documentos-emo-modal/documentos-emo-modal';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';
import { NavigationService } from '../../../../core/navigation/navigation.service';
import { CatalogosHabService } from '../../../habilitacion/services/catalogos-hab.service';
import { AreaArbolNodoDto } from '../../../habilitacion/dtos/catalogos.model';
import { getGerencias, getHijos } from '../../../../shared/utils/area-arbol.util';

interface FilterOption {
  id: string;
  nombre: string;
}

/** Feature que habilita el botón "Configuración" de EMOs (rol ADMINISTRADOR DEL SISTEMA). */
const FEATURE_CONFIGURACION = 'ssoma.salud-ocupacional.emos.configuracion';

@Component({
  selector: 'app-salud-emos',
  standalone: true,
  imports: [
    FabButton,
    CommonModule,
    FormsModule,
    Paginator,
    SearchSelect,
    EmoCreate,
    EmoDetail,
    ProgramarEmoDialogComponent,
    EditarEmoModal,
    DocumentosEmoModal,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    TitleCasePipe,
  ],
  templateUrl: './emos.html',
  styleUrl: './emos.css',
})
export class Emos implements OnInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  anioActual = new Date().getFullYear();
  readonly pageSize = 50;

  filters = {
    search: '',
    aptitud: '',
    estado: '',
    empresaId: 0,
    proyectoId: 0,
    fechaEmoDesde: '',
    fechaEmoHasta: '',
    sinLectura: false,
    sinCertificado: false,
    sinEmoCompleto: false,
    sinInterconsulta: false,
    sortBy: '',
    sortDesc: false,
  };

  sortOptions: FilterOption[] = [
    { id: '', nombre: 'Nombre (A-Z)' },
    { id: 'fechaEmo', nombre: 'Fecha de EMO' },
    { id: 'fechaVencimiento', nombre: 'Fecha de vencimiento' },
  ];

  proyectoOptions: SelectOption[] = [];

  aptitudOptions: FilterOption[] = [
    { id: '', nombre: 'Todas las aptitudes' },
    ...APTITUD_CHART_ORDER.map((a) => ({ id: a, nombre: a })),
  ];

  estadoOptions: FilterOption[] = [
    { id: '', nombre: 'Todos los estados' },
    { id: 'Vigente', nombre: 'Vigente' },
    { id: 'Por Vencer', nombre: 'Por Vencer' },
    { id: 'Vencido', nombre: 'Vencido' },
    { id: 'Convalidado', nombre: 'Convalidado' },
    { id: 'Anulado', nombre: 'Anulado' },
    { id: 'Sin EMO', nombre: 'Sin EMO' },
  ];

  empresaOptions: Array<EmpresaSimpleDto & { idAsString?: string }> = [];
  areaArbolNodos: AreaArbolNodoDto[] = [];
  gerenciaOptions: AreaArbolNodoDto[] = [];
  areaScopeOptions: AreaArbolNodoDto[] = [];
  filtroGerenciaId: number | null = null;
  filtroAreaScopeId: number | null = null;

  get filtroAreaEfectivo(): number | null {
    return this.filtroAreaScopeId ?? this.filtroGerenciaId;
  }

  filtrosAbiertos = false;

  /** Subtab "Pendientes de lectura": solo EMOs marcados para que los lea el médico de Abril. */
  soloPendientesLecturaAbril = false;

  /** El botón "Configuración" del header se muestra solo con esta feature. */
  puedeConfigurar = false;

  /**
   * Ficha a la que se entró desde Reclutamiento («Programar EMO de ingreso»). Mientras esté
   * puesta, la lista muestra solo esa fila: el finalista es uno entre 900+ registros y sin esto
   * caería en cualquier página. Se limpia con el aviso de arriba de la tabla.
   */
  workerIdEnfocado: number | null = null;

  items: EmoPorTrabajadorDto[] = [];
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  selectedEmoId: number | null = null;
  createOpen = false;

  selectedWorkerForProgramar: EmoPorTrabajadorDto | null = null;
  emoSeleccionado: EmoPorTrabajadorDto | null = null;
  emoDocumentos: EmoPorTrabajadorDto | null = null;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: EmoService,
    private catalogos: CatalogosSaludService,
    private sharedFilters: SharedFiltersService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private navigationService: NavigationService,
    private catalogosHabService: CatalogosHabService,
  ) {}

  ngOnInit(): void {
    this.puedeConfigurar = this.navigationService.isFeatureAllowed(FEATURE_CONFIGURACION);

    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.load(1));

    this.loadEmpresas();
    this.loadProyectos();
    this.loadAreas();

    // Enlace desde Reclutamiento: ?workerId=123&programar=1 deja la lista con esa sola ficha y,
    // si viene programar=1, abre el modal de programación apenas llegue la fila.
    const qp = this.route.snapshot.queryParamMap;
    const workerId = Number(qp.get('workerId'));
    this.workerIdEnfocado = Number.isFinite(workerId) && workerId > 0 ? workerId : null;
    this.abrirProgramarAlCargar = this.workerIdEnfocado !== null && qp.get('programar') === '1';

    this.load(1);
  }

  /** Pendiente de abrir el modal de programación en cuanto llegue la fila del deep link. */
  private abrirProgramarAlCargar = false;

  /** Vuelve a la lista completa tras haber entrado enfocado en una sola ficha. */
  quitarFoco(): void {
    this.workerIdEnfocado = null;
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.load(1);
  }

  private loadProyectos(): void {
    this.sharedFilters.getProyectos().subscribe({
      next: (list) => {
        this.proyectoOptions = list;
        this.cdr.detectChanges();
      },
      error: () => { this.proyectoOptions = []; },
    });
  }

  private loadAreas(): void {
    this.catalogosHabService.getAreaArbol().subscribe({
      next: (list) => {
        this.areaArbolNodos = list ?? [];
        this.gerenciaOptions = getGerencias(this.areaArbolNodos);
        this.cdr.detectChanges();
      },
      error: () => { this.areaArbolNodos = []; this.gerenciaOptions = []; },
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

  private loadEmpresas(): void {
    this.catalogos.getEmpresas().subscribe({
      next: (list) => {
        this.empresaOptions = [
          { id: 0, nombre: 'Todas las empresas', esAbril: false },
          ...list,
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        this.empresaOptions = [{ id: 0, nombre: 'Todas las empresas', esAbril: false }];
      },
    });
  }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    const query: EmoPorTrabajadorQuery = {
      page,
      pageSize: this.pageSize,
      workerId: this.workerIdEnfocado ?? undefined,
      search: this.filters.search?.trim() || undefined,
      aptitud: this.filters.aptitud || undefined,
      estado: this.filters.estado || undefined,
      empresaId: this.filters.empresaId || undefined,
      proyectoId: this.filters.proyectoId || undefined,
      areaScopeId: this.filtroAreaEfectivo ?? undefined,
      fechaEmoDesde: this.filters.fechaEmoDesde || undefined,
      fechaEmoHasta: this.filters.fechaEmoHasta || undefined,
      sinLectura: this.filters.sinLectura || undefined,
      sinCertificado: this.filters.sinCertificado || undefined,
      sinEmoCompleto: this.filters.sinEmoCompleto || undefined,
      sinInterconsulta: this.filters.sinInterconsulta || undefined,
      pendienteLecturaAbril: this.soloPendientesLecturaAbril || undefined,
      sortBy: this.filters.sortBy || undefined,
      sortDesc: this.filters.sortDesc || undefined,
    };
    this.service.getEmosPorTrabajador(query).subscribe({
      next: (res) => {
        this.items = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        this.loading = false;
        this.loaderService.hide();

        if (this.abrirProgramarAlCargar) {
          this.abrirProgramarAlCargar = false;
          const ficha = this.items.find((i) => i.workerId === this.workerIdEnfocado);
          if (ficha) this.selectedWorkerForProgramar = ficha;
        }

        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onFilterChange(): void {
    this.load(1);
  }

  setSubtab(pendientesLecturaAbril: boolean): void {
    if (this.soloPendientesLecturaAbril === pendientesLecturaAbril) return;
    this.soloPendientesLecturaAbril = pendientesLecturaAbril;
    this.load(1);
  }

  /** Alterna el orden de una columna: primero ascendente, luego descendente, luego sin orden. */
  toggleSort(column: 'fechaEmo' | 'fechaVencimiento'): void {
    if (this.filters.sortBy !== column) {
      this.filters.sortBy = column;
      this.filters.sortDesc = false;
    } else if (!this.filters.sortDesc) {
      this.filters.sortDesc = true;
    } else {
      this.filters.sortBy = '';
      this.filters.sortDesc = false;
    }
    this.load(1);
  }

  sortIcon(column: 'fechaEmo' | 'fechaVencimiento'): string {
    if (this.filters.sortBy !== column) return '↕';
    return this.filters.sortDesc ? '▼' : '▲';
  }

  descargarExcel(): void {
    this.loaderService.show();
    const query: EmoPorTrabajadorQuery = {
      search: this.filters.search?.trim() || undefined,
      aptitud: this.filters.aptitud || undefined,
      estado: this.filters.estado || undefined,
      empresaId: this.filters.empresaId || undefined,
      proyectoId: this.filters.proyectoId || undefined,
      areaScopeId: this.filtroAreaEfectivo ?? undefined,
      fechaEmoDesde: this.filters.fechaEmoDesde || undefined,
      fechaEmoHasta: this.filters.fechaEmoHasta || undefined,
      sinLectura: this.filters.sinLectura || undefined,
      sinCertificado: this.filters.sinCertificado || undefined,
      sinEmoCompleto: this.filters.sinEmoCompleto || undefined,
      sinInterconsulta: this.filters.sinInterconsulta || undefined,
      pendienteLecturaAbril: this.soloPendientesLecturaAbril || undefined,
      sortBy: this.filters.sortBy || undefined,
      sortDesc: this.filters.sortDesc || undefined,
    };
    this.service.exportarPorTrabajadorExcel(query).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `EMOs_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  irAConfiguracion(): void {
    if (!this.puedeConfigurar) return;
    this.router.navigate(['/ssoma/salud-ocupacional/emos/configuracion']);
  }

  clearFilters(): void {
    this.filters = {
      search: '', aptitud: '', estado: '', empresaId: 0, proyectoId: 0,
      fechaEmoDesde: '', fechaEmoHasta: '',
      sinLectura: false, sinCertificado: false, sinEmoCompleto: false, sinInterconsulta: false,
      sortBy: '', sortDesc: false,
    };
    this.filtroGerenciaId = null;
    this.filtroAreaScopeId = null;
    this.areaScopeOptions = [];
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  openCreate(): void {
    this.createOpen = true;
  }

  registrarEmoPara(item: EmoPorTrabajadorDto, event: MouseEvent): void {
    event.stopPropagation();
    this.createOpen = true;
  }

  closeCreate(): void {
    this.createOpen = false;
  }

  onCreated(): void {
    this.createOpen = false;
    this.load(this.currentPage);
  }

  onRowClick(item: EmoPorTrabajadorDto): void {
    if (item.tieneEmo && item.emoId != null) {
      this.selectedEmoId = item.emoId;
    }
  }

  closeDetail(): void {
    this.selectedEmoId = null;
  }

  onDetailSaved(): void {
    this.load(this.currentPage);
  }

  verHistorial(item: EmoPorTrabajadorDto, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/ssoma/salud-ocupacional/emos', item.workerId, 'historial']);
  }

  abrirProgramarEmo(item: EmoPorTrabajadorDto, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedWorkerForProgramar = item;
  }

  onProgramarEmoCerrado(reload: boolean): void {
    this.selectedWorkerForProgramar = null;
    if (reload) this.load(this.currentPage);
  }

  abrirDocumentos(item: EmoPorTrabajadorDto, event: MouseEvent): void {
    event.stopPropagation();
    this.emoDocumentos = item;
  }

  onDocumentosClosed(): void {
    this.emoDocumentos = null;
    this.load(this.currentPage);
  }

  abrirEditar(item: EmoPorTrabajadorDto, event: MouseEvent): void {
    event.stopPropagation();
    this.emoSeleccionado = item;
  }

  onEditarClosed(): void {
    this.emoSeleccionado = null;
  }

  onEditarSaved(): void {
    this.emoSeleccionado = null;
    this.load(this.currentPage);
  }

  aptitudClass(aptitud?: string): string {
    return aptitud ? aptitudBadgeClass(aptitud) : 'bg-gray-100 text-gray-500 border-gray-200';
  }

  diasClass(dias?: number): string {
    if (dias == null) return 'bg-gray-100 text-gray-500 border-gray-200';
    return diasVencerBadgeClass(dias);
  }

  diasLabel(dias?: number): string {
    if (dias == null) return '—';
    return diasVencerStyle(dias).label;
  }

  estadoClass(estado?: string, tieneEmo?: boolean): string {
    if (!tieneEmo) return 'bg-red-50 text-red-700 border-red-200';
    switch (estado) {
      case 'Vigente':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Por Vencer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Vencido':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Convalidado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Anulado':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  estadoLabel(item: EmoPorTrabajadorDto): string {
    return item.tieneEmo ? item.estado ?? '—' : 'Sin EMO';
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.search ||
      this.filters.aptitud ||
      this.filters.estado ||
      this.filters.empresaId ||
      this.filters.proyectoId ||
      this.filtroAreaEfectivo ||
      this.filters.fechaEmoDesde ||
      this.filters.fechaEmoHasta ||
      this.filters.sinLectura ||
      this.filters.sinCertificado ||
      this.filters.sinEmoCompleto ||
      this.filters.sinInterconsulta ||
      this.filters.sortBy
    );
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.search) n++;
    if (this.filters.aptitud) n++;
    if (this.filters.estado) n++;
    if (this.filters.empresaId) n++;
    if (this.filters.proyectoId) n++;
    if (this.filtroAreaEfectivo) n++;
    if (this.filters.fechaEmoDesde) n++;
    if (this.filters.fechaEmoHasta) n++;
    if (this.filters.sinLectura) n++;
    if (this.filters.sinCertificado) n++;
    if (this.filters.sinEmoCompleto) n++;
    if (this.filters.sinInterconsulta) n++;
    return n;
  }
}
