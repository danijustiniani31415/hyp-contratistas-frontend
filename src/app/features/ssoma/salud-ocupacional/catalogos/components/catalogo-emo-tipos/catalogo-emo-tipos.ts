import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import { EmoTipoDto } from '../../../dtos/catalogos.model';
import { EmoTipoForm } from '../emo-tipo-form/emo-tipo-form';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';

@Component({
  selector: 'app-catalogo-emo-tipos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Paginator,
    EmoTipoForm,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    StatusBadge,
    TitleCasePipe,
    AbrilBulkActionDirective,
  ],
  templateUrl: './catalogo-emo-tipos.html',
  styleUrl: './catalogo-emo-tipos.css',
})
export class CatalogoEmoTipos implements OnInit, OnDestroy {
  readonly pageSize = 15;

  filters = { search: '', estado: '' as '' | 'activo' | 'inactivo' };

  all: EmoTipoDto[] = [];
  filtered: EmoTipoDto[] = [];
  pageItems: EmoTipoDto[] = [];

  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  loading = false;

  formOpen = false;
  formMode: 'create' | 'edit' = 'create';
  formInitial: EmoTipoDto | null = null;

  filtrosAbiertos = false;
  readonly estadoFilterOptions = [
    { value: '', label: 'Todos' },
    { value: 'activo', label: 'Activos' },
    { value: 'inactivo', label: 'Inactivos' },
  ];

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilters(1));
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.listEmoTipos().subscribe({
      next: (res) => {
        this.all = res ?? [];
        this.applyFilters(1);
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

  applyFilters(page: number): void {
    const q = this.filters.search.trim().toLowerCase();
    const estado = this.filters.estado;
    this.filtered = this.all.filter((e) => {
      const activo = e.activo ?? true;
      if (estado === 'activo' && !activo) return false;
      if (estado === 'inactivo' && activo) return false;
      if (!q) return true;
      return (
        e.nombre.toLowerCase().includes(q) ||
        (e.descripcion ?? '').toLowerCase().includes(q)
      );
    });
    this.totalRecords = this.filtered.length;
    this.totalPages = Math.max(Math.ceil(this.totalRecords / this.pageSize), 1);
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
    const start = (this.currentPage - 1) * this.pageSize;
    this.pageItems = this.filtered.slice(start, start + this.pageSize);
  }

  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchChange$.next(value);
  }

  onFilterChange(): void {
    this.applyFilters(1);
  }

  clearFilters(): void {
    this.filters = { search: '', estado: '' };
    this.applyFilters(1);
  }

  onPageChange(page: number): void {
    this.applyFilters(page);
  }

  openCreate(): void {
    this.formMode = 'create';
    this.formInitial = null;
    this.formOpen = true;
  }

  openEdit(item: EmoTipoDto): void {
    this.formMode = 'edit';
    this.formInitial = item;
    this.formOpen = true;
  }

  closeForm(): void {
    this.formOpen = false;
    this.formInitial = null;
  }

  onSaved(): void {
    this.formOpen = false;
    this.formInitial = null;
    this.load();
  }

  toggleActivo(item: EmoTipoDto): void {
    const current = item.activo ?? true;
    const next = !current;
    Swal.fire({
      icon: 'question',
      title: next ? '¿Activar tipo de EMO?' : '¿Desactivar tipo de EMO?',
      text: item.nombre,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.service
        .updateEmoTipo(item.id, {
          nombre: item.nombre,
          vigenciaMeses: item.vigenciaMeses,
          requiereNuevo: item.requiereNuevo,
          descripcion: item.descripcion ?? null,
          activo: next,
        })
        .subscribe({
          next: () => {
            this.loaderService.hide();
            this.load();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.estado);
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filters.search) n++;
    if (this.filters.estado) n++;
    return n;
  }
}
