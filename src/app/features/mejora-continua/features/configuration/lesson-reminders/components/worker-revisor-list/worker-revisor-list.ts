import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { LessonReminderService } from '../../services/lesson-reminder.service';
import { WorkerRevisorItemDTO, WorkerRevisorOptionDTO } from '../../dtos/workerRevisor.model';

@Component({
  selector: 'app-worker-revisor-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, SearchInput, Paginator],
  templateUrl: './worker-revisor-list.html',
})
export class WorkerRevisorList implements OnInit {
  rows: WorkerRevisorItemDTO[] = [];
  options: WorkerRevisorOptionDTO[] = [];
  searchText = '';
  /** Filtro por jefe asignado: workerId del jefe o null = todos. */
  jefeFilter: number | null = null;
  /** Filtro por categoría del revisor: workersCategoryId o null = todas. */
  categoriaFilter: number | null = null;
  /** Filtro por categoría del trabajador: workersCategoryId o null = todas. */
  categoriaTrabajadorFilter: number | null = null;
  currentPage = 1;
  readonly pageSize = 10;

  /** Worker en edición (solo uno a la vez) y jefe seleccionado en el selector. */
  editingWorkerId: number | null = null;
  selectedJefeId: number | null = null;

  constructor(
    private service: LessonReminderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getWorkerRevisores().subscribe({
      next: (data) => {
        this.rows = data;
        this.service.getWorkerRevisorOptions().subscribe({
          next: (opts) => {
            this.options = opts;
            this.loaderService.hide();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  startEdit(item: WorkerRevisorItemDTO): void {
    this.editingWorkerId = item.workerId;
    this.selectedJefeId = item.jefeWorkerId;
  }

  cancelEdit(): void {
    this.editingWorkerId = null;
    this.selectedJefeId = null;
  }

  toggleAutoApprove(item: WorkerRevisorItemDTO): void {
    if (item.jefeWorkerId != null) return;

    this.loaderService.show();
    this.service.toggleAutoApproveLesson(item.workerId).subscribe({
      next: (result) => {
        item.autoApproveLesson = result.autoApproveLesson;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  save(item: WorkerRevisorItemDTO): void {
    if (this.selectedJefeId === item.workerId) {
      Swal.fire({
        icon: 'warning',
        title: 'Selección inválida',
        text: 'Un trabajador no puede ser su propio jefe.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    this.loaderService.show();
    this.service.updateWorkerRevisor(item.workerId, { jefeWorkerId: this.selectedJefeId }).subscribe({
      next: () => {
        const jefe = this.options.find((o) => o.workerId === this.selectedJefeId);
        item.jefeWorkerId = this.selectedJefeId;
        item.jefeFullName = jefe?.fullName;
        item.jefeEmail = jefe?.email;
        // Asignar un revisor desactiva la auto-aprobación (regla del backend).
        if (this.selectedJefeId != null) item.autoApproveLesson = false;
        this.cancelEdit();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get filteredRows(): WorkerRevisorItemDTO[] {
    return this.rows.filter((r) => {
      const matchesName =
        !this.searchText.trim() ||
        SearchInput.matches(r.fullName ?? '', this.searchText) ||
        SearchInput.matches(r.jefeFullName ?? '', this.searchText);
      const matchesJefe = this.jefeFilter == null || r.jefeWorkerId === this.jefeFilter;
      const matchesCategoria =
        this.categoriaFilter == null || r.jefeCategoryId === this.categoriaFilter;
      const matchesCategoriaTrabajador =
        this.categoriaTrabajadorFilter == null || r.categoryId === this.categoriaTrabajadorFilter;
      return matchesName && matchesJefe && matchesCategoria && matchesCategoriaTrabajador;
    });
  }

  /** Categorías de los trabajadores que actualmente son revisores (opciones del filtro). */
  get categoriaFilterOptions(): { id: number; name: string }[] {
    const seen = new Map<number, string>();
    for (const r of this.rows) {
      if (r.jefeCategoryId != null && r.jefeCategory && !seen.has(r.jefeCategoryId)) {
        seen.set(r.jefeCategoryId, r.jefeCategory);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Categorías de los trabajadores listados (opciones del filtro). */
  get categoriaTrabajadorFilterOptions(): { id: number; name: string }[] {
    const seen = new Map<number, string>();
    for (const r of this.rows) {
      if (r.categoryId != null && r.category && !seen.has(r.categoryId)) {
        seen.set(r.categoryId, r.category);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Jefes que aparecen asignados en la lista (opciones del filtro). */
  get jefeFilterOptions(): WorkerRevisorOptionDTO[] {
    const seen = new Map<number, WorkerRevisorOptionDTO>();
    for (const r of this.rows) {
      if (r.jefeWorkerId != null && !seen.has(r.jefeWorkerId)) {
        seen.set(r.jefeWorkerId, {
          workerId: r.jefeWorkerId,
          fullName: r.jefeFullName,
          email: r.jefeEmail,
        });
      }
    }
    return [...seen.values()].sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.cancelEdit();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  get pagedRows(): WorkerRevisorItemDTO[] {
    const page = Math.min(this.currentPage, this.totalPages);
    return this.filteredRows.slice((page - 1) * this.pageSize, page * this.pageSize);
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.cancelEdit();
  }
}
