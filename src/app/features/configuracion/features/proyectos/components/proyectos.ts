import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { ProyectoService } from '../services/proyecto.service';
import { ProjectDto } from '../dtos/project.dto';
import { ProjectFilterDto } from '../dtos/project-filter.dto';
import { ProyectoCreate } from './create/proyecto-create';
import { ProyectoEdit } from './edit/proyecto-edit';
import { ProyectoEmails } from './emails/proyecto-emails';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';

import { CONFIGURACION_TABS } from '../../../shared/configuracion-tabs';
@Component({
  selector: 'app-proyectos-config',
  imports: [CommonModule, FormsModule, ProyectoCreate, ProyectoEdit, ProyectoEmails, AbrilPageHeaderComponent, SearchInput],
  templateUrl: './proyectos.html',
  styleUrl: './proyectos.css',
})
export class Proyectos implements OnInit {
  readonly tabs = CONFIGURACION_TABS;
  projects: PagedResponseDTO<ProjectDto> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  filters: ProjectFilterDto = {
    page: 1,
    ruc: '',
    razonSocial: '',
    projectDescription: '',
  };

  loader = false;
  showCreateModal = false;
  showEditModal = false;
  showEmailsModal = false;
  selectedProject: ProjectDto | null = null;
  selectedEmailsProject: ProjectDto | null = null;

  constructor(
    private proyectoService: ProyectoService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load(1);
  }

  openCreateModal(event: MouseEvent): void {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  openEditModal(project: ProjectDto, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedProject = project;
    this.showEditModal = true;
  }

  openEmailsModal(project: ProjectDto, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedEmailsProject = project;
    this.showEmailsModal = true;
  }

  onModalClosed(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showEmailsModal = false;
    this.selectedProject = null;
    this.selectedEmailsProject = null;
  }

  onModalSaved(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showEmailsModal = false;
    this.selectedProject = null;
    this.selectedEmailsProject = null;
    this.load(this.currentPage);
  }

  search(): void {
    this.load(1);
  }

  load(page: number = 1): void {
    this.loader = true;
    this.cdr.detectChanges();

    this.proyectoService.getPaged({ ...this.filters, page }).subscribe({
      next: (response) => {
        this.projects = response;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.pageSize = response.pageSize;
        this.totalRecords = response.totalRecords;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.load(this.currentPage + 1);
  }

  prevPage(): void {
    if (this.currentPage > 1) this.load(this.currentPage - 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.load(page);
  }

  get pages(): number[] {
    const maxButtons = 5;
    if (this.totalPages <= maxButtons)
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);

    let start = this.currentPage - Math.floor(maxButtons / 2);
    let end = start + maxButtons - 1;

    if (start < 1) { start = 1; end = maxButtons; }
    if (end > this.totalPages) { end = this.totalPages; start = end - maxButtons + 1; }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  deleteProject(projectId: number, event: MouseEvent): void {
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
      if (!result.isConfirmed) return;
      this.loader = true;

      this.proyectoService.delete(projectId).subscribe({
        next: (response: ApiMessageDTO) => {
          this.load(this.currentPage);
          this.loader = false;
          this.cdr.detectChanges();
          Swal.fire({
            title: '¡Eliminado!',
            text: response.message ?? 'El registro ha sido eliminado.',
            confirmButtonColor: '#64BC04',
            icon: 'success',
          });
        },
        error: (err: HttpErrorResponse) => this.handleError(err),
      });
    });
  }

  private handleError(err: HttpErrorResponse): void {
    this.loader = false;
    this.cdr.detectChanges();

    if (err.status === 401) {
      Swal.fire({ icon: 'error', title: 'Sesión expirada', text: err.error?.message ?? '' });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }
    if (err.status >= 400 && err.status < 500) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message ?? 'Ocurrió un error.' });
      return;
    }
    Swal.fire({ icon: 'error', title: 'Error del servidor', text: err.error?.message ?? 'Ocurrió un error.' });
  }
}
