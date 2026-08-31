import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectLinkList } from './list/list';
import { ProjectLinkCreate } from './create/create';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { ProjectLinkService } from '../services/project-link.service';
import { ProjectLinkFormDataDto, ProjectSimpleDto } from '../dtos/project-link-form-data.dto';
import { ProjectLinkFilterDto } from '../dtos/project-link-filter.dto';
import { ProjectLinkDto } from '../dtos/project-link.dto';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { ErrorService } from '../../../../../../core/services/error.service';

@Component({
  selector: 'app-project-link',
  standalone: true,
  imports: [CommonModule, FormsModule, ProjectLinkList, ProjectLinkCreate, Paginator, SearchSelect],
  templateUrl: './project-link.html',
  styleUrl: './project-link.css',
})
export class ProjectLink implements OnInit {
  @ViewChild(ProjectLinkList) list!: ProjectLinkList;

  formData: ProjectLinkFormDataDto = { projects: [], types: [] };
  projectOptions: ProjectSimpleDto[] = [];

  filters: ProjectLinkFilterDto = { projectId: null, page: 1 };

  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  showCreateModal = false;

  constructor(
    private service: ProjectLinkService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.service.getFormData().subscribe({
      next: (data) => {
        this.formData = data;
        this.projectOptions = [
          { projectId: null as any, projectDescription: 'Todos los proyectos' },
          ...data.projects,
        ];
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  /** Abre el modal de creación (invocado desde el botón del header del contenedor). */
  openCreate(): void {
    this.showCreateModal = true;
  }

  onSearch(): void {
    this.list.load(1);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.list.load(page);
  }

  onPagedData(data: PagedResponseDTO<ProjectLinkDto>): void {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }
}
