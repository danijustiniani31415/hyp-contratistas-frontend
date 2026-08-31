import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { StaffProjectEmailList } from './list/list';
import { StaffProjectEmailCreate } from './create/create';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { StaffProjectEmailService } from '../services/staff-project-email.service';
import { StaffProjectEmailFormDataDto } from '../dtos/staff-project-email-form-data.dto';
import { StaffProjectEmailFilterDto } from '../dtos/staff-project-email-filter.dto';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { StaffProjectEmailDto } from '../dtos/staff-project-email.dto';
import { ErrorService } from '../../../../../../core/services/error.service';

@Component({
  selector: 'app-staff-project-email',
  standalone: true,
  imports: [CommonModule, FormsModule, StaffProjectEmailList, StaffProjectEmailCreate, Paginator, SearchSelect, SearchInput],
  templateUrl: './staff-project-email.html',
  styleUrl: './staff-project-email.css',
})
export class StaffProjectEmail implements OnInit {
  @ViewChild(StaffProjectEmailList) list!: StaffProjectEmailList;

  formData: StaffProjectEmailFormDataDto = { projects: [], types: [] };
  projectOptions: any[] = [];
  typeOptions: any[] = [];

  filters: StaffProjectEmailFilterDto = { projectId: null, email: null, staffProjectEmailTypeId: null, page: 1 };

  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  showCreateModal = false;

  constructor(
    private service: StaffProjectEmailService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.service.getFormData().subscribe({
      next: (data) => {
        this.formData = data;
        this.projectOptions = [
          { projectId: null, projectDescription: 'Todos los proyectos' },
          ...data.projects,
        ];
        this.typeOptions = [
          { staffProjectEmailTypeId: null, description: 'Todos los tipos' },
          ...data.types,
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

  onPagedData(data: PagedResponseDTO<StaffProjectEmailDto>): void {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }
}
