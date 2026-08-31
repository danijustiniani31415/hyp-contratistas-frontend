import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ProgramacionService } from '../services/programacion.service';
import { CatalogosSaludService } from '../services/catalogos-salud.service';
import {
  EstadoProgramacion,
  ProgramacionListDto,
  ProgramacionQueryParams,
  ProgramacionResumenDto,
} from '../dtos/programacion.model';
import { ClinicaSimpleDto } from '../dtos/catalogos.model';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { ViewToggle } from '../../../../shared/components/view-toggle/view-toggle';
import { ViewToggleMode } from '../../../../shared/components/view-toggle/view-toggle.model';
import {
  estadoBadgeClass,
  estadoProgramacionStyle,
} from '../shared/estado.utils';
import { ProgramacionCreate } from './components/programacion-create/programacion-create';
import { FabButton } from '../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { parseFechaLocal, toIsoLocal } from '../../../../shared/utils/fecha-local.util';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../shared/directives/abril-bulk-action.directive';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';
import { CatalogosHabService } from '../../../habilitacion/services/catalogos-hab.service';
import { AreaArbolNodoDto } from '../../../habilitacion/dtos/catalogos.model';
import { getGerencias, getHijos } from '../../../../shared/utils/area-arbol.util';

interface DiaCalendario {
  fecha: Date;
  key: string;
  items: ProgramacionListDto[];
}

interface FilterOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-salud-programaciones',
  standalone: true,
  imports: [FabButton,
    CommonModule,
    FormsModule,
    Paginator,
    SearchSelect,
    ViewToggle,
    ProgramacionCreate,
    DatePipe,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    TitleCasePipe,
    AbrilBulkActionDirective,
  ],
  templateUrl: './programaciones.html',
  styleUrl: './programaciones.css',
})
export class Programaciones implements OnInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  anioActual = new Date().getFullYear();
  readonly pageSize = 15;

  filters = {
    search: '',
    estado: '',
    desde: '',
    hasta: '',
  };

  estadoOptions: FilterOption[] = [
    { id: '', nombre: 'Todos los estados' },
    { id: 'Programada', nombre: 'Programada' },
    { id: 'Confirmada', nombre: 'Confirmada' },
    { id: 'Completada', nombre: 'Completada' },
    { id: 'Programado', nombre: 'Programado' },
    { id: 'Confirmado', nombre: 'Confirmado' },
    { id: 'Aceptado por Clínica', nombre: 'Aceptado por Clínica' },
    { id: 'Rechazado por Clínica', nombre: 'Rechazado por Clínica' },
    { id: 'En Atención', nombre: 'En Atención' },
    { id: 'Completado', nombre: 'Completado' },
    { id: 'No se presentó', nombre: 'No se presentó' },
    { id: 'Cancelado', nombre: 'Cancelado' },
    { id: 'Cancelada', nombre: 'Cancelada' },
    { id: 'Reprogramado', nombre: 'Reprogramado' },
  ];

  viewModes: ViewToggleMode[] = [
    {
      value: 'list',
      label: 'Lista',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    },
    {
      value: 'calendar',
      label: 'Calendario',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    },
  ];
  viewMode: 'list' | 'calendar' = 'list';

  items: ProgramacionListDto[] = [];
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  resumen: ProgramacionResumenDto = {
    programados: 0,
    aceptados: 0,
    enAtencion: 0,
    completados: 0,
    rechazados: 0,
    noPresento: 0,
    automaticos: 0,
    total: 0,
  };

  createOpen = false;
  filtrosAbiertos = false;
  rechazandoId: number | null = null;
  motivoRechazo = '';
  filtroClinicaId: number | null = null;
  clinicas: ClinicaSimpleDto[] = [];
  areaArbolNodos: AreaArbolNodoDto[] = [];
  gerenciaOptions: AreaArbolNodoDto[] = [];
  areaScopeOptions: AreaArbolNodoDto[] = [];
  filtroGerenciaId: number | null = null;
  filtroAreaScopeId: number | null = null;

  get filtroAreaEfectivo(): number | null {
    return this.filtroAreaScopeId ?? this.filtroGerenciaId;
  }

  // Calendario
  semanaInicio: Date = this.startOfWeek(new Date());
  calendarioDias: DiaCalendario[] = [];
  calendarioItems: ProgramacionListDto[] = [];

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: ProgramacionService,
    private catalogosSvc: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private catalogosHabService: CatalogosHabService,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => {
        this.load(1);
        this.loadResumen();
      });
    this.catalogosSvc.getClinicas().subscribe((data) => (this.clinicas = data));
    this.catalogosHabService.getAreaArbol().subscribe({
      next: (list) => {
        this.areaArbolNodos = list ?? [];
        this.gerenciaOptions = getGerencias(this.areaArbolNodos);
        this.cdr.detectChanges();
      },
      error: () => { this.areaArbolNodos = []; this.gerenciaOptions = []; },
    });
    this.load(1);
    this.loadResumen();
  }

  onGerenciaChange(id: number | null): void {
    this.filtroGerenciaId = id;
    this.filtroAreaScopeId = null;
    this.areaScopeOptions = id ? getHijos(this.areaArbolNodos, id) : [];
    this.onFilterChange();
  }

  loadResumen(): void {
    this.service
      .getResumen({
        search: this.filters.search?.trim() || undefined,
        desde: this.filters.desde || undefined,
        hasta: this.filters.hasta || undefined,
        clinicaId: this.filtroClinicaId ?? undefined,
        areaScopeId: this.filtroAreaEfectivo ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.resumen = res;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    const query: ProgramacionQueryParams = {
      page,
      pageSize: this.pageSize,
      search: this.filters.search?.trim() || undefined,
      estado: this.filters.estado || undefined,
      desde: this.filters.desde || undefined,
      hasta: this.filters.hasta || undefined,
      clinicaId: this.filtroClinicaId ?? undefined,
      areaScopeId: this.filtroAreaScopeId ?? undefined,
    };
    this.service.getProgramaciones(query).subscribe({
      next: (res) => {
        this.items = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  loadSemana(): void {
    this.loading = true;
    this.loaderService.show();
    const fin = new Date(this.semanaInicio);
    fin.setDate(fin.getDate() + 6);
    const query: ProgramacionQueryParams = {
      desde: this.toIsoDate(this.semanaInicio),
      hasta: this.toIsoDate(fin),
      pageSize: 500,
      page: 1,
    };
    this.service.getProgramaciones(query).subscribe({
      next: (res) => {
        this.calendarioItems = res.data ?? [];
        this.buildCalendarioDias();
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private buildCalendarioDias(): void {
    const dias: DiaCalendario[] = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(this.semanaInicio);
      fecha.setDate(fecha.getDate() + i);
      const key = this.toIsoDate(fecha);
      dias.push({
        fecha,
        key,
        items: this.calendarioItems
          .filter((p) => (p.fechaProgramada || '').substring(0, 10) === key)
          .sort((a, b) => (a.horaProgramada || '').localeCompare(b.horaProgramada || '')),
      });
    }
    this.calendarioDias = dias;
  }

  onViewModeChange(mode: string): void {
    this.viewMode = mode as 'list' | 'calendar';
    if (mode === 'calendar') this.loadSemana();
  }

  prevSemana(): void {
    const d = new Date(this.semanaInicio);
    d.setDate(d.getDate() - 7);
    this.semanaInicio = d;
    this.loadSemana();
  }

  nextSemana(): void {
    const d = new Date(this.semanaInicio);
    d.setDate(d.getDate() + 7);
    this.semanaInicio = d;
    this.loadSemana();
  }

  hoySemana(): void {
    this.semanaInicio = this.startOfWeek(new Date());
    this.loadSemana();
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onFilterChange(): void {
    this.load(1);
    this.loadResumen();
  }

  clearFilters(): void {
    this.filters = { search: '', estado: '', desde: '', hasta: '' };
    this.filtroClinicaId = null;
    this.filtroGerenciaId = null;
    this.filtroAreaScopeId = null;
    this.areaScopeOptions = [];
    this.load(1);
    this.loadResumen();
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  openCreate(): void {
    this.createOpen = true;
  }

  closeCreate(): void {
    this.createOpen = false;
  }

  onCreated(): void {
    this.createOpen = false;
    if (this.viewMode === 'calendar') this.loadSemana();
    else this.load(this.currentPage);
    this.loadResumen();
  }

  cambiarEstado(item: ProgramacionListDto, estado: EstadoProgramacion): void {
    Swal.fire({
      icon: 'question',
      title: `¿Marcar como "${estado}"?`,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.service.patchEstado(item.id, { estado }).subscribe({
        next: (updated) => {
          this.loaderService.hide();
          Object.assign(item, updated);
          if (this.viewMode === 'calendar') this.loadSemana();
          this.loadResumen();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  estadoClass(estado: string): string {
    return estadoBadgeClass(estadoProgramacionStyle(estado));
  }

  formatFecha(fecha: string): string {
    const d = parseFechaLocal(fecha);
    return d === null
      ? fecha
      : d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  puedeConfirmar(e: ProgramacionListDto): boolean {
    return e.estado === 'Programada';
  }

  puedeMarcarNoPresento(e: ProgramacionListDto): boolean {
    return e.estado === 'Programada' || e.estado === 'Confirmada';
  }

  puedeCancelar(e: ProgramacionListDto): boolean {
    return e.estado === 'Programada' || e.estado === 'Confirmada';
  }

  puedeAceptarClinica(e: ProgramacionListDto): boolean {
    return e.estado === 'Programado' || e.estado === 'Confirmado';
  }

  puedeRechazarClinica(e: ProgramacionListDto): boolean {
    return e.estado === 'Programado' || e.estado === 'Confirmado';
  }

  puedeVerMotivoRechazo(e: ProgramacionListDto): boolean {
    return !!e.motivoRechazo;
  }

  esAutomatico(e: ProgramacionListDto): boolean {
    return e.origen === 'Automatico';
  }

  iniciarRechazo(id: number): void {
    this.rechazandoId = id;
    this.motivoRechazo = '';
  }

  confirmarRechazo(item: ProgramacionListDto): void {
    if (!this.motivoRechazo.trim()) return;
    this.rechazandoId = null;
    this.service
      .accionClinica(item.id, { id: item.id, accion: 'Rechazar', motivoRechazo: this.motivoRechazo })
      .subscribe({
        next: () => {
          this.load(this.currentPage);
          this.loadResumen();
        },
        error: (err) => this.errorService.handleError(err),
      });
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay() || 7; // 1..7, lunes=1
    if (day !== 1) d.setDate(d.getDate() - (day - 1));
    return d;
  }

  private toIsoDate(d: Date): string {
    return toIsoLocal(d);
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.search ||
      this.filters.estado ||
      this.filters.desde ||
      this.filters.hasta ||
      this.filtroClinicaId ||
      this.filtroAreaEfectivo
    );
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.search) n++;
    if (this.filters.estado) n++;
    if (this.filters.desde) n++;
    if (this.filters.hasta) n++;
    if (this.filtroClinicaId) n++;
    if (this.filtroAreaEfectivo) n++;
    return n;
  }

  get clinicaOptions(): Array<{ id: number | null; nombre: string }> {
    return [{ id: null, nombre: 'Todas' }, ...this.clinicas];
  }

  get semanaLabel(): string {
    const fin = new Date(this.semanaInicio);
    fin.setDate(fin.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return `${this.semanaInicio.toLocaleDateString('es-PE', opts)} — ${fin.toLocaleDateString('es-PE', opts)}`;
  }
}
