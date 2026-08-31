import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdjudicacionFolderList } from './list/list';
import { AdjudicacionFolderCreate } from './create/create';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AdjudicacionFolderService } from '../services/adjudicacion-folder.service';
import { AdjudicacionFolderFormDataDto, ProjectSimpleDto } from '../dtos/adjudicacion-folder-form-data.dto';
import { AdjudicacionFolderFilterDto } from '../dtos/adjudicacion-folder-filter.dto';
import { AdjudicacionFolderDto } from '../dtos/adjudicacion-folder.dto';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { ErrorService } from '../../../../../../core/services/error.service';

@Component({
  selector: 'app-adjudicacion-folder',
  standalone: true,
  imports: [CommonModule, FormsModule, AdjudicacionFolderList, AdjudicacionFolderCreate, Paginator, SearchSelect],
  templateUrl: './adjudicacion-folder.html',
  styleUrl: './adjudicacion-folder.css',
})
export class AdjudicacionFolder implements OnInit {
  @ViewChild(AdjudicacionFolderList) list!: AdjudicacionFolderList;

  formData: AdjudicacionFolderFormDataDto = { projects: [], folderTypes: [] };
  projectOptions: ProjectSimpleDto[] = [];

  filters: AdjudicacionFolderFilterDto = { projectId: null, page: 1 };

  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  showCreateModal = false;

  constructor(
    private service: AdjudicacionFolderService,
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

  onPagedData(data: PagedResponseDTO<AdjudicacionFolderDto>): void {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }
}
