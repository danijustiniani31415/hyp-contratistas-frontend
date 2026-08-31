import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GaTrayectoService } from '../services/trayectos.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { GaTrayectoListItemDto } from '../dtos/ga-trayecto.dto';
import { GaTrayectoCreate } from '../components/create/create';
import { GaTrayectoEdit } from '../components/edit/edit';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../shared/utils/client-pager';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';

@Component({
  standalone: true,
  selector: 'app-ga-trayectos',
  imports: [
    CommonModule,
    GaTrayectoCreate,
    GaTrayectoEdit,
    StatusBadge,
    TitleCasePipe,
    AbrilBulkActionDirective,
    Paginator,
    FilterModal,
    SearchInput,
    SearchSelect,
  ],
  templateUrl: './trayectos.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaTrayectos implements OnInit {
  trayectos: GaTrayectoListItemDto[] = [];
  showCreateModal = false;
  showEditModal = false;
  trayectoToEdit: GaTrayectoListItemDto | null = null;

  searchText = '';
  estadoFilter: boolean | null = null;
  readonly estadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<GaTrayectoListItemDto>();

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

  get filteredTrayectos(): GaTrayectoListItemDto[] {
    return this.trayectos.filter((t) => {
      const matchesTexto =
        !this.searchText.trim() ||
        SearchInput.matches(t.lugarOrigenNombre ?? '', this.searchText) ||
        SearchInput.matches(t.lugarDestinoNombre ?? '', this.searchText);
      const matchesEstado = this.estadoFilter === null || t.activo === this.estadoFilter;
      return matchesTexto && matchesEstado;
    });
  }

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredTrayectos);
  }

  get pagedTrayectos(): GaTrayectoListItemDto[] {
    return this.pager.page(this.filteredTrayectos);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }

  constructor(
    private service: GaTrayectoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getAll().subscribe({
      next: (data) => {
        this.trayectos = data;
        this.pager.reset();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggle(t: GaTrayectoListItemDto): void {
    this.loaderService.show();
    this.service.toggle(t.id).subscribe({
      next: (res) => {
        t.activo = res.activo;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Abre el modal de creación (invocado desde el botón del header del contenedor). */
  openCreate(): void {
    this.showCreateModal = true;
  }

  openEdit(t: GaTrayectoListItemDto): void {
    this.trayectoToEdit = t;
    this.showEditModal = true;
  }
}
