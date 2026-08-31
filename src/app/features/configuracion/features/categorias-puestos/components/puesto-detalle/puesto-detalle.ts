import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CategoriasPuestosService } from '../../services/categorias-puestos.service';
import { PuestoAdminDto, PuestoTrabajadorDto } from '../../dtos/categorias-puestos.dto';

/**
 * Detalle de un puesto: los trabajadores que lo tienen asignado. Se abre al hacer clic
 * en la fila de la tabla de puestos y pide su propia lista al abrirse (la carga inicial
 * de la pantalla solo trae el conteo: un puesto puede tener cientos de fichas).
 */
@Component({
  standalone: true,
  selector: 'app-puesto-detalle',
  imports: [CommonModule, BaseModal, Paginator, SearchInput, TitleCasePipe],
  templateUrl: './puesto-detalle.html',
})
export class PuestoDetalle implements OnInit {
  /** Puesto cuya fila se clickeó: de acá salen el nombre y la categoría del encabezado. */
  @Input({ required: true }) puesto!: PuestoAdminDto;
  @Output() closeModal = new EventEmitter<void>();

  trabajadores: PuestoTrabajadorDto[] = [];
  /** La respuesta ya llegó (aunque venga vacía): distingue "sin trabajadores" de "cargando". */
  cargado = false;
  searchText = '';

  private readonly pager = new ClientPager<PuestoTrabajadorDto>();

  constructor(
    private service: CategoriasPuestosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getTrabajadoresPorPuesto(this.puesto.id).subscribe({
      next: (data) => {
        // El backend ya los manda ordenados por nombre.
        this.trabajadores = data ?? [];
        this.cargado = true;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.closeModal.emit();
        this.cdr.detectChanges();
      },
    });
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────

  /**
   * Va inline y no en `app-filter-modal`: es un solo campo dentro de un modal, y abrir
   * un modal de filtros encima de este sería peor de usar.
   */
  onSearchChange(): void {
    this.pager.reset();
  }

  get filteredTrabajadores(): PuestoTrabajadorDto[] {
    if (!this.searchText.trim()) return this.trabajadores;
    return this.trabajadores.filter(
      (t) =>
        SearchInput.matches(t.nombreCompleto ?? '', this.searchText) ||
        SearchInput.matches(t.emailCorporativo ?? '', this.searchText),
    );
  }

  // ── Paginación ────────────────────────────────────────────────────────

  get currentPage(): number {
    return this.pager.currentPage;
  }

  get totalPages(): number {
    return this.pager.totalPages(this.filteredTrabajadores);
  }

  get pagedTrabajadores(): PuestoTrabajadorDto[] {
    return this.pager.page(this.filteredTrabajadores);
  }

  changePage(page: number): void {
    this.pager.goTo(page);
  }
}
