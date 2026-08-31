import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { CasoSocialService } from '../services/caso-social.service';
import { CasoSocialListItemDto, CasoSocialFilterDto } from '../dtos/caso-social.dtos';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';
import { FabButton } from '../../../../shared/components/fab-button/fab-button';
import { CasoSocialModalComponent } from './caso-social-modal.component';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { WorkerSearchInput } from '../shared/worker-search-input/worker-search-input';
import { WorkerSearchItemDto } from '../dtos/worker-search.model';

@Component({
  selector: 'app-asistente-social',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FabButton,
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    Paginator,
    SearchSelect,
    CasoSocialModalComponent,
    FilterTriggerButton,
    FilterModal,
    StatusBadge,
    TitleCasePipe,
    WorkerSearchInput,
  ],
  templateUrl: './asistente-social.component.html',
  styleUrl: './asistente-social.component.css',
})
export class AsistenteSocialComponent implements OnInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  readonly anioActual = new Date().getFullYear();
  readonly pageSize = 20;

  casos: CasoSocialListItemDto[] = [];
  loading = false;
  totalPages = 1;
  totalRecords = 0;
  currentPage = 1;

  modalVisible = false;
  modalCasoId: string | null = null;
  filtrosAbiertos = false;

  filtros: CasoSocialFilterDto = {};
  workerFiltroSelected: WorkerSearchItemDto | null = null;

  readonly tiposOpts = [
    { id: '', nombre: 'Todos los tipos' },
    { id: 'Familiar', nombre: 'Familiar' },
    { id: 'Económico', nombre: 'Económico' },
    { id: 'Salud Mental', nombre: 'Salud Mental' },
    { id: 'Legal', nombre: 'Legal' },
    { id: 'Laboral', nombre: 'Laboral' },
    { id: 'Otro', nombre: 'Otro' },
  ];

  readonly estadosOpts = [
    { id: '', nombre: 'Todos los estados' },
    { id: 'Abierto', nombre: 'Abierto' },
    { id: 'En Seguimiento', nombre: 'En Seguimiento' },
    { id: 'Cerrado', nombre: 'Cerrado' },
  ];

  readonly prioridadesOpts = [
    { id: '', nombre: 'Todas las prioridades' },
    { id: 'Alta', nombre: 'Alta' },
    { id: 'Media', nombre: 'Media' },
    { id: 'Baja', nombre: 'Baja' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private svc: CasoSocialService,
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
    this.svc.getList({ ...this.filtros, page }).subscribe({
      next: (res: PagedResponseDTO<CasoSocialListItemDto>) => {
        this.casos        = res.data;
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

  eliminar(caso: CasoSocialListItemDto, ev: MouseEvent): void {
    ev.stopPropagation();
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar caso social?',
      text: `${caso.tipoCaso} — ${caso.workerNombre ?? ''}`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.delete(caso.id).subscribe({
        next: () => this.load(this.currentPage),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  abrirModal(caso?: CasoSocialListItemDto): void {
    this.modalCasoId = caso?.id ?? null;
    this.modalVisible = true;
    this.cdr.detectChanges();
  }

  onModalClosed(): void {
    this.modalVisible = false;
    this.cdr.detectChanges();
  }

  onModalSaved(): void {
    this.load(this.currentPage);
  }

  get hasFilters(): boolean {
    return !!(this.filtros.workerId || this.filtros.estado || this.filtros.tipoCaso
           || this.filtros.prioridad || this.filtros.empresaId);
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtros.workerId) n++;
    if (this.filtros.estado) n++;
    if (this.filtros.tipoCaso) n++;
    if (this.filtros.prioridad) n++;
    if (this.filtros.empresaId) n++;
    return n;
  }

  badgeClass(prioridad: string): string {
    if (prioridad === 'Alta') return 'bg-red-100 text-red-700';
    if (prioridad === 'Media') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  }

  estadoClass(estado: string): string {
    if (estado === 'Abierto') return 'bg-blue-100 text-blue-700';
    if (estado === 'En Seguimiento') return 'bg-orange-100 text-orange-700';
    return 'bg-gray-100 text-gray-600';
  }
}
