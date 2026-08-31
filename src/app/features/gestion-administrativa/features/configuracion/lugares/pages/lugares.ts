import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GaLugarCreate } from '../components/create/create';
import { GaLugarEdit } from '../components/edit/edit';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { GaLugarService } from '../services/lugares.service';
import { GaLugarConfigItemDto } from '../dtos/ga-lugar.dto';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { DEFAULT_PAGE_SIZE } from '../../../../../../shared/constants/pagination';

@Component({
  standalone: true,
  selector: 'app-ga-lugares',
  imports: [CommonModule, GaLugarCreate, GaLugarEdit, StatusBadge, TitleCasePipe, AbrilBulkActionDirective, FilterModal, SearchInput, Paginator, SearchSelect],
  templateUrl: './lugares.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GaLugares implements OnInit {
  lugares: GaLugarConfigItemDto[] = [];
  showCreateModal = false;
  showEditModal = false;
  lugarToEdit: GaLugarConfigItemDto | null = null;

  searchText = '';
  estadoFilter: boolean | null = null;
  readonly estadoFilterOptions = [
    { value: null,  label: 'Todos' },
    { value: true,  label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];
  filtrosAbiertos = false;
  currentPage = 1;
  readonly pageSize = DEFAULT_PAGE_SIZE;

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim())      n++;
    if (this.estadoFilter !== null)  n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.estadoFilter = null;
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  changePage(page: number): void {
    this.currentPage = page;
  }

  constructor(
    private service: GaLugarService,
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
        this.lugares = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggle(lugar: GaLugarConfigItemDto): void {
    this.loaderService.show();

    if (lugar.tipo === 'proyecto') {
      this.service.toggleProyecto(lugar.projectId!).subscribe({
        next: (res) => {
          this.loaderService.hide();
          lugar.activo = res.activo;
          lugar.gaLugarId = res.gaLugarId;
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    } else {
      this.service.toggle(lugar.gaLugarId!).subscribe({
        next: (res) => {
          this.loaderService.hide();
          lugar.activo = res.activo;
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    }
  }

  /** Abre el modal de creación (invocado desde el botón del header del contenedor). */
  openCreate(): void {
    this.showCreateModal = true;
  }

  openEdit(lugar: GaLugarConfigItemDto): void {
    this.lugarToEdit = lugar;
    this.showEditModal = true;
  }

  private matchesSearch(l: GaLugarConfigItemDto): boolean {
    const matchesNombre = !this.searchText.trim() || SearchInput.matches(l.nombreDisplay ?? '', this.searchText);
    const matchesEstado = this.estadoFilter === null || l.activo === this.estadoFilter;
    return matchesNombre && matchesEstado;
  }

  get fijos(): GaLugarConfigItemDto[] {
    return this.lugares.filter((l) => l.tipo === 'fijo' && this.matchesSearch(l));
  }

  get proyectosFiltrados(): GaLugarConfigItemDto[] {
    return this.lugares.filter((l) => l.tipo === 'proyecto' && this.matchesSearch(l));
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.proyectosFiltrados.length / this.pageSize));
  }

  get proyectos(): GaLugarConfigItemDto[] {
    const page = Math.min(this.currentPage, this.totalPages);
    return this.proyectosFiltrados.slice((page - 1) * this.pageSize, page * this.pageSize);
  }
}
