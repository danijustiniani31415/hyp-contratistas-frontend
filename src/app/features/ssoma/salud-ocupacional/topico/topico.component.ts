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
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { TopicoService } from './topico.service';
import { TopicoModalComponent } from './topico-modal.component';
import { TopicoAtencionDto, TopicoFiltrosDto } from './topico.dtos';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { FabButton } from '../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { WorkerSearchInput } from '../shared/worker-search-input/worker-search-input';
import { WorkerSearchItemDto } from '../dtos/worker-search.model';

import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';

@Component({
  selector: 'app-salud-topico',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FabButton,
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    Paginator,
    SearchSelect,
    TopicoModalComponent,
    FilterTriggerButton,
    FilterModal,
    StatusBadge,
    TitleCasePipe,
    WorkerSearchInput,
  ],
  templateUrl: './topico.component.html',
  styleUrl: './topico.component.css',
})
export class TopicoComponent implements OnInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
  readonly pageSize = 20;

  atenciones: TopicoAtencionDto[] = [];
  loading = false;
  totalPages = 1;
  totalRecords = 0;
  currentPage = 1;

  filtros: TopicoFiltrosDto = {};
  workerFiltroSelected: WorkerSearchItemDto | null = null;

  modalVisible = false;
  atencionSeleccionada: TopicoAtencionDto | null = null;
  filtrosAbiertos = false;

  readonly estadoOpts = [
    { value: '', label: 'Todos' },
    { value: 'Abierta', label: 'Abierta' },
    { value: 'Cerrada', label: 'Cerrada' },
  ];

  readonly tipoOpts = [
    { id: '',  nombre: 'Todos los tipos' },
    { id: '1', nombre: 'Consulta General' },
    { id: '2', nombre: 'Emergencia' },
    { id: '3', nombre: 'Control' },
    { id: '4', nombre: 'Primeros Auxilios' },
    { id: '5', nombre: 'Otro' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private svc: TopicoService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load(1);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getList({ ...this.filtros, page, pageSize: this.pageSize }).subscribe({
      next: (res: PagedResponseDTO<TopicoAtencionDto>) => {
        this.atenciones   = res.data;
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

  abrirModal(a?: TopicoAtencionDto): void {
    this.atencionSeleccionada = a ?? null;
    this.modalVisible = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    this.modalVisible = false;
    this.atencionSeleccionada = null;
    this.cdr.detectChanges();
  }

  onGuardado(): void { this.cerrarModal(); this.load(this.currentPage); }

  cerrarAtencion(a: TopicoAtencionDto, ev: MouseEvent): void {
    ev.stopPropagation();
    Swal.fire({
      icon: 'question',
      title: '¿Cerrar atención?',
      text: `Atención #${a.id} — ${a.workerNombre ?? ''}`,
      showCancelButton: true,
      confirmButtonText: 'Cerrar atención',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.cerrar(a.id).subscribe({
        next: () => this.load(this.currentPage),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  eliminar(a: TopicoAtencionDto, ev: MouseEvent): void {
    ev.stopPropagation();
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar atención?',
      text: `Atención #${a.id} — ${a.workerNombre ?? ''}`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.delete(a.id).subscribe({
        next: () => this.load(this.currentPage),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  get hasFilters(): boolean {
    return !!(this.filtros.fechaDesde || this.filtros.fechaHasta
           || this.filtros.workerId  || this.filtros.tipoAtencionId
           || this.filtros.estado);
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtros.fechaDesde) n++;
    if (this.filtros.fechaHasta) n++;
    if (this.filtros.workerId) n++;
    if (this.filtros.tipoAtencionId) n++;
    if (this.filtros.estado) n++;
    return n;
  }
}
