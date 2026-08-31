import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReclutadoresService } from '../services/reclutadores.service';
import { ReclutadorDto } from '../dtos/reclutador.dto';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../shared/utils/client-pager';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';

/**
 * Sección "Reclutadores" de Gestión GTH → Configuración.
 *
 * Lista sola a los trabajadores del área de Gestión del Talento Humano: no se dan de alta ni de
 * baja, lo único que se administra es el interruptor de cada uno, que decide quién sale en el
 * desplegable "Responsable del proceso" del detalle de Reclutamiento.
 *
 * El interruptor vive en una tabla filtro aparte (`gth_responsable_proceso`), así que desactivar
 * a alguien acá no lo desactiva en `workers` ni en ninguna otra pantalla del sistema.
 */
@Component({
  standalone: true,
  selector: 'app-gth-reclutadores',
  imports: [
    CommonModule,
    StatusBadge,
    TitleCasePipe,
    AbrilBulkActionDirective,
    Paginator,
    FilterModal,
    SearchInput,
    SearchSelect,
  ],
  templateUrl: './reclutadores.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GthReclutadores implements OnInit {
  reclutadores: ReclutadorDto[] = [];

  searchText = '';
  estadoFilter: boolean | null = null;
  readonly estadoFilterOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];
  filtrosAbiertos = false;

  private readonly pager = new ClientPager<ReclutadorDto>();

  constructor(
    private service: ReclutadoresService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getAll().subscribe({
      next: (data) => {
        this.reclutadores = data ?? [];
        this.pager.reset();
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  toggle(r: ReclutadorDto): void {
    this.loaderService.show();
    this.service.toggle(r.workerId, !r.activo).subscribe({
      next: (res) => {
        r.activo = res.activo;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Filtros ────────────────────────────────────────────────────────

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

  get filteredReclutadores(): ReclutadorDto[] {
    return this.reclutadores.filter((r) => {
      const texto = this.searchText.trim();
      const matchesTexto =
        !texto ||
        SearchInput.matches(r.nombre ?? '', texto) ||
        SearchInput.matches(r.puesto ?? '', texto);
      const matchesEstado = this.estadoFilter === null || r.activo === this.estadoFilter;
      return matchesTexto && matchesEstado;
    });
  }

  // ── Paginación ─────────────────────────────────────────────────────

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredReclutadores);
  }

  get pagedReclutadores(): ReclutadorDto[] {
    return this.pager.page(this.filteredReclutadores);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }
}
