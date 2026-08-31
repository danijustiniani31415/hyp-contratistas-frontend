import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MilestoneService } from '../../../../../core/services/milestone.service';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MilestoneCreateDTO } from '../../../../../core/dtos/milestone/milestoneCreate.model';
import { MilestoneEditDTO } from '../../../../../core/dtos/milestone/milestoneEdit.model';
import { MilestoneGetDTO } from '../../../../../core/dtos/milestone/milestone.model';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { ProyectoService } from '../../../../configuracion/features/proyectos/services/proyecto.service';
import { ProjectDto } from '../../../../configuracion/features/proyectos/dtos/project.dto';
import { ProjectEditDto } from '../../../../configuracion/features/proyectos/dtos/project-edit.dto';

type MilestonesTab = 'hitos' | 'proyectos';

import { PROJECTS_TABS } from '../../../shared/projects-tabs';
@Component({
  selector: 'app-milestones',
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './milestones.html',
  styleUrl: './milestones.css',
})
export class Milestones implements OnInit {
  readonly tabs = PROJECTS_TABS;
  anioActual = new Date().getFullYear();

  activeTab: MilestonesTab = 'hitos';

  milestones: PagedResponseDTO<MilestoneGetDTO> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  createDto: MilestoneCreateDTO = {
    milestoneDescription: '',
    active: true,
  };
  editDto: MilestoneEditDTO = {
    milestoneId: 0,
    milestoneDescription: '',
    active: true,
  };

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  loader = false;

  showCreateModal = false;
  showEditModal = false;

  // ── Pestaña "Proyectos Activos" ──────────────────────────────────────────
  proyectos: PagedResponseDTO<ProjectDto> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };
  proyectosLoading = false;
  proyectosCurrentPage = 1;
  proyectosTotalPages = 0;
  proyectosTotalRecords = 0;
  togglingProjectId: number | null = null;

  constructor(
    private milestoneService: MilestoneService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private proyectoService: ProyectoService,
  ) {}

  ngOnInit(): void {
    this.loadMilestones(1);
  }

  setTab(tab: MilestonesTab): void {
    this.activeTab = tab;
    if (tab === 'proyectos' && this.proyectos.data.length === 0 && !this.proyectosLoading) {
      this.loadProyectos(1);
    }
  }

  loadProyectos(page: number = 1): void {
    this.proyectosLoading = true;
    this.cdr.detectChanges();

    this.proyectoService
      .getPaged({ page, ruc: '', razonSocial: '', projectDescription: '' })
      .subscribe({
        next: (response) => {
          this.proyectos = response;
          this.proyectosCurrentPage = response.page;
          this.proyectosTotalPages = response.totalPages;
          this.proyectosTotalRecords = response.totalRecords;
          this.proyectosLoading = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.proyectosLoading = false;
          this.error(err);
        },
      });
  }

  toggleProyectoActive(item: ProjectDto): void {
    if (this.togglingProjectId != null) return;

    this.togglingProjectId = item.projectId;
    const nuevoEstado = !item.active;
    const dto: ProjectEditDto = { ...item, active: nuevoEstado };

    this.proyectoService.edit(dto).subscribe({
      next: () => {
        item.active = nuevoEstado;
        this.togglingProjectId = null;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'success',
          title: nuevoEstado ? 'Proyecto activado' : 'Proyecto desactivado',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.togglingProjectId = null;
        this.error(err);
      },
    });
  }

  prevProyectosPage(): void {
    if (this.proyectosCurrentPage > 1) {
      this.loadProyectos(this.proyectosCurrentPage - 1);
    }
  }

  nextProyectosPage(): void {
    if (this.proyectosCurrentPage < this.proyectosTotalPages) {
      this.loadProyectos(this.proyectosCurrentPage + 1);
    }
  }

  goToProyectosPage(page: number): void {
    if (page >= 1 && page <= this.proyectosTotalPages) {
      this.loadProyectos(page);
    }
  }

  get proyectosPages(): number[] {
    return this.computePages(this.proyectosCurrentPage, this.proyectosTotalPages);
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openEditModal(milestone: MilestoneGetDTO, event: MouseEvent) {
    event.stopPropagation();
    this.showEditModal = true;
    this.editDto.milestoneId = milestone.milestoneId;
    this.editDto.milestoneDescription = milestone.milestoneDescription;
    this.editDto.active = milestone.active;
  }

  closeModal(event: MouseEvent, number: number) {
    if (number == 1) {
      this.showCreateModal = false;
      this.showEditModal = false;
      return;
    }
    if (event.target === event.currentTarget) {
      this.showCreateModal = false;
      this.showEditModal = false;
    }
  }

  loadMilestones(page: number = 1) {
    this.loader = true;
    this.cdr.detectChanges();

    this.milestoneService.getMilestonePaged(page).subscribe({
      next: (response) => {
        this.milestones = response;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.pageSize = response.pageSize;
        this.totalRecords = response.totalRecords;

        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadMilestones(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadMilestones(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadMilestones(page);
      this.cdr.detectChanges();
    }
  }

  get pages(): number[] {
    return this.computePages(this.currentPage, this.totalPages);
  }

  private computePages(currentPage: number, totalPages: number): number[] {
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let start = currentPage - Math.floor(maxButtons / 2);
    let end = currentPage + Math.floor(maxButtons / 2);

    if (start < 1) {
      start = 1;
      end = maxButtons;
    }

    if (end > totalPages) {
      end = totalPages;
      start = totalPages - maxButtons + 1;
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  saveMilestone() {
    if (!this.createDto.milestoneDescription.trim()) {
      return;
    }
    this.loader = true;
    this.milestoneService.createMilestone(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createDto = { milestoneDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadMilestones();
        Swal.fire({
          title: response.message ?? 'Hito creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  editMilestone(event: MouseEvent) {
    event.stopPropagation();
    if (!this.editDto.milestoneDescription.trim()) {
      return;
    }
    this.loader = true;
    this.milestoneService.editMilestone(this.editDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showEditModal = false;
        this.editDto = { milestoneId: 0, milestoneDescription: '', active: true };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadMilestones();
        Swal.fire({
          title: response.message ?? 'Hito actualizado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  deleteMilestone(milestoneId: number, event: MouseEvent) {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loader = true;
        this.milestoneService.deleteMilestone(milestoneId).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loadMilestones();
            this.loader = false;
            this.cdr.detectChanges();
            Swal.fire({
              title: '¡Eliminado!',
              text: response.message ?? 'El registro ha sido eliminado.',
              confirmButtonColor: '#64BC04',
              icon: 'success',
            });
          },
          error: (err: HttpErrorResponse) => {
            this.error(err);
          },
        });
      }
    });
  }

  error(err: HttpErrorResponse) {
    this.loader = false;
    this.cdr.detectChanges();

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: err.error?.message ?? '',
      });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }
  }
}
