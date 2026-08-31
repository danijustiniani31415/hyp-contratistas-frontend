import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { FabButton } from '../../../../shared/components/fab-button/fab-button';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';
import { DescansosService } from './descansos.service';
import { DescansoModalComponent } from './descanso-modal.component';
import { DescansoMedicoListItemDto, DescansoFilterDto, DescansoTipoDto } from './descansos.dtos';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../shared/components/date-picker/date-picker';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { WorkerSearchInput } from '../shared/worker-search-input/worker-search-input';
import { WorkerSearchItemDto } from '../dtos/worker-search.model';

@Component({
  selector: 'app-descansos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    Paginator,
    FabButton,
    DescansoModalComponent,
    FilterTriggerButton,
    FilterModal,
    SearchSelect,
    DatePicker,
    StatusBadge,
    TitleCasePipe,
    WorkerSearchInput,
  ],
  templateUrl: './descansos.component.html',
  styleUrl: './descansos.component.css',
})
export class DescansosComponent implements OnInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
  readonly pageSize = 20;

  descansos: DescansoMedicoListItemDto[] = [];
  /** Catálogo de tipos (ss_descanso_tipo): alimenta el filtro y el formulario del modal. */
  tipos: DescansoTipoDto[] = [];
  loading = false;
  totalPages = 1;
  totalRecords = 0;
  currentPage = 1;

  filtros: DescansoFilterDto = {};
  /** Trabajador elegido en el filtro por nombre/DNI — solo para mostrar la selección; el filtro real sigue viajando como filtros.workerId. */
  workerFiltroSelected: WorkerSearchItemDto | null = null;

  modalVisible = false;
  descansoSeleccionadoId: number | null = null;
  filtrosAbiertos = false;

  readonly estadoOpts = [
    { id: '', nombre: 'Todos' },
    { id: 'Pendiente',  nombre: 'Pendiente' },
    { id: 'Aprobado',   nombre: 'Aprobado' },
    { id: 'Rechazado',  nombre: 'Rechazado' },
    { id: 'Completado', nombre: 'Completado' },
  ];

  /** Opciones del filtro de tipo: "Todos" + el catálogo, en el orden que define el backend. */
  get tipoOpts(): { id: number | null; nombre: string }[] {
    return [
      { id: null, nombre: 'Todos' },
      ...this.tipos.map((t) => ({ id: t.id, nombre: t.nombre })),
    ];
  }

  private destroy$ = new Subject<void>();

  constructor(
    private svc          : DescansosService,
    private errorService : ErrorService,
    private loaderService: LoaderService,
    private cdr          : ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadInicial();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  /** Carga inicial: catálogo de tipos + primera página en una sola petición. */
  private loadInicial(): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getInicio({ page: 1 }).subscribe({
      next: (res) => {
        this.tipos        = res.tipos;
        this.descansos    = res.descansos.data;
        this.currentPage  = res.descansos.page;
        this.totalPages   = Math.max(res.descansos.totalPages, 1);
        this.totalRecords = res.descansos.totalRecords;
        this.loading      = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getList({ ...this.filtros, page }).subscribe({
      next: (res: PagedResponseDTO<DescansoMedicoListItemDto>) => {
        this.descansos    = res.data;
        this.currentPage  = res.page;
        this.totalPages   = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        this.loading      = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  onFilterChange(): void { this.load(1); }
  onPageChange(p: number): void { this.load(p); }

  onWorkerFiltroChange(w: WorkerSearchItemDto | null): void {
    this.workerFiltroSelected = w;
    this.filtros.workerId = w?.id;
    this.load(1);
  }

  limpiarFiltros(): void {
    this.filtros = {};
    this.workerFiltroSelected = null;
    this.load(1);
  }

  abrirModal(id?: number): void {
    this.descansoSeleccionadoId = id ?? null;
    this.modalVisible = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    this.modalVisible = false;
    this.descansoSeleccionadoId = null;
    this.cdr.detectChanges();
  }

  onGuardado(): void { this.cerrarModal(); this.load(this.currentPage); }

  eliminar(d: DescansoMedicoListItemDto, ev: MouseEvent): void {
    ev.stopPropagation();
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar descanso?',
      text: `Descanso #${d.id} — ${d.workerNombre ?? ''}`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.svc.delete(d.id).subscribe({
        next: () => { this.loaderService.hide(); this.load(this.currentPage); },
        error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
      });
    });
  }

  get hasFilters(): boolean {
    return !!(this.filtros.fechaDesde || this.filtros.fechaHasta
           || this.filtros.workerId   || this.filtros.estado || this.filtros.tipoId);
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtros.fechaDesde) n++;
    if (this.filtros.fechaHasta) n++;
    if (this.filtros.workerId) n++;
    if (this.filtros.estado) n++;
    if (this.filtros.tipoId) n++;
    return n;
  }

  estadoBadgeClass(estado: string): string {
    return ({
      'Pendiente' : 'badge-amber',
      'Aprobado'  : 'badge-green',
      'Rechazado' : 'badge-red',
      'Completado': 'badge-blue',
    } as Record<string, string>)[estado] ?? 'badge-gray';
  }
}
