import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { TitleCasePipe } from '../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { DEFAULT_PAGE_SIZE } from '../../../../../shared/constants/pagination';
import { DelegacionRevisionService } from '../services/delegacion-revision.service';
import {
  DelegacionAsignacionItemDTO,
  DelegacionRevisorAsignadoDTO,
} from '../dtos/delegacion.model';
import { DelegacionEditar } from './editar/editar';

import { GESTION_ADMINISTRATIVA_TABS } from '../../../shared/gestion-administrativa-tabs';
/**
 * "Delegación de Revisión" (usuario final). Muestra las áreas/proyectos donde el usuario
 * es revisor y le permite designar suplentes de su área y activarse/desactivarse
 * ("tomar/soltar el puesto"). Reusa la lógica de Revisores de Áreas pero autogestionada.
 */
@Component({
  standalone: true,
  selector: 'app-delegacion-revision',
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    Paginator,
    TitleCasePipe,
    AbrilBulkActionDirective,
    DelegacionEditar,
  ],
  templateUrl: './delegacion-revision.html',
})
export class DelegacionRevision implements OnInit {
  readonly tabs = GESTION_ADMINISTRATIVA_TABS;
  anioActual = new Date().getFullYear();

  currentWorkerId = 0;
  rows: DelegacionAsignacionItemDTO[] = [];

  searchText = '';
  filtrosAbiertos = false;

  currentPage = 1;
  readonly pageSize = DEFAULT_PAGE_SIZE;

  /** Asignación con el modal de edición abierto. null = cerrado. */
  editando: DelegacionAsignacionItemDTO | null = null;

  constructor(
    private service: DelegacionRevisionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getInitialData().subscribe({
      next: (data) => {
        this.currentWorkerId = data.currentWorkerId;
        this.rows = data.asignaciones ?? [];
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  openEdit(item: DelegacionAsignacionItemDTO): void {
    this.editando = item;
  }

  onSaved(): void {
    this.load();
  }

  // ── Celda "Revisores" ─────────────────────────────────────────────────

  revisoresOrdenados(revisores: DelegacionRevisorAsignadoDTO[]): DelegacionRevisorAsignadoDTO[] {
    return [...(revisores ?? [])].sort((a, b) => a.ordenPrioridad - b.ordenPrioridad);
  }

  revisorPrincipal(revisores: DelegacionRevisorAsignadoDTO[]): DelegacionRevisorAsignadoDTO | undefined {
    return this.revisoresOrdenados(revisores).find((r) => r.active);
  }

  /** true si el usuario está delegando (él mismo inactivo pero hay algún suplente activo). */
  estaDelegando(item: DelegacionAsignacionItemDTO): boolean {
    const yo = item.revisores.find((r) => r.revisorWorkerId === this.currentWorkerId);
    return !!yo && !yo.active && item.revisores.some((r) => r.active);
  }

  // ── Filtros / paginación ──────────────────────────────────────────────

  get filteredRows(): DelegacionAsignacionItemDTO[] {
    const q = this.searchText.trim();
    if (!q) return this.rows;
    return this.rows.filter(
      (r) =>
        SearchInput.matches(r.areaName ?? '', q) ||
        SearchInput.matches(r.projectName ?? '', q) ||
        (r.revisores ?? []).some((rev) => SearchInput.matches(rev.revisorFullName ?? '', q)),
    );
  }

  get filtrosActivos(): number {
    return this.searchText.trim() ? 1 : 0;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  get pagedRows(): DelegacionAsignacionItemDTO[] {
    const page = Math.min(this.currentPage, this.totalPages);
    return this.filteredRows.slice((page - 1) * this.pageSize, page * this.pageSize);
  }

  changePage(page: number): void {
    this.currentPage = page;
  }
}
