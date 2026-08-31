import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CategoriasPuestosService } from '../../services/categorias-puestos.service';
import { CategoriaAdminDto, PuestoAdminDto } from '../../dtos/categorias-puestos.dto';
import { CategoriaCreateEdit } from '../categoria-create-edit/categoria-create-edit';

/**
 * Sección "Categorías" de Gestión GTH → Configuración → Categorías y Puestos. Los datos los
 * carga y refresca el contenedor (una sola petición para ambas secciones); acá viven los
 * filtros, la paginación y los modales propios de la sección.
 */
@Component({
  standalone: true,
  selector: 'app-config-categorias',
  imports: [
    CommonModule,
    StatusBadge,
    TitleCasePipe,
    AbrilBulkActionDirective,
    Paginator,
    FilterModal,
    SearchInput,
    SearchSelect,
    CategoriaCreateEdit,
  ],
  templateUrl: './categorias.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class ConfigCategorias {
  @Input() categorias: CategoriaAdminDto[] = [];
  /** Puestos de todo el catálogo: se usan para contar cuántos cuelgan de cada categoría. */
  @Input() puestos: PuestoAdminDto[] = [];
  /** Pide al contenedor recargar el catálogo tras crear/editar/activar. */
  @Output() changed = new EventEmitter<void>();

  showModal = false;
  categoriaToEdit: CategoriaAdminDto | null = null;

  searchText = '';
  estadoFilter: boolean | null = null;
  readonly estadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<CategoriaAdminDto>();

  constructor(
    private service: CategoriasPuestosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  // ── Filtros ───────────────────────────────────────────────────────────

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.estadoFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.estadoFilter = null;
    this.onFilterChange();
  }

  onFilterChange(): void {
    this.pager.reset();
  }

  get filteredCategorias(): CategoriaAdminDto[] {
    return this.categorias.filter((c) => {
      const matchesTexto =
        !this.searchText.trim() || SearchInput.matches(c.nombre ?? '', this.searchText);
      const matchesEstado = this.estadoFilter === null || c.activo === this.estadoFilter;
      return matchesTexto && matchesEstado;
    });
  }

  // ── Paginación ────────────────────────────────────────────────────────

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredCategorias);
  }

  get pagedCategorias(): CategoriaAdminDto[] {
    return this.pager.page(this.filteredCategorias);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  // ── Celdas ────────────────────────────────────────────────────────────

  /** Cuántos puestos del catálogo pertenecen a la categoría. */
  puestosDe(categoria: CategoriaAdminDto): number {
    return this.puestos.filter((p) => p.categoriaId === categoria.id).length;
  }

  // ── Acciones ──────────────────────────────────────────────────────────

  /** Abre el modal de creación (lo invoca el botón del header del contenedor). */
  openCreate(): void {
    this.categoriaToEdit = null;
    this.showModal = true;
  }

  openEdit(categoria: CategoriaAdminDto): void {
    this.categoriaToEdit = categoria;
    this.showModal = true;
  }

  closeModales(): void {
    this.showModal = false;
    this.categoriaToEdit = null;
  }

  onSaved(): void {
    this.changed.emit();
  }

  toggle(categoria: CategoriaAdminDto): void {
    this.loaderService.show();
    this.service.toggleCategoria(categoria.id, !categoria.activo).subscribe({
      next: () => {
        this.loaderService.hide();
        this.changed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
