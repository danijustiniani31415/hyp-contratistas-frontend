import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { WorkItemCategoryList } from './list/list';
import { WorkItemCategoryCreate } from './create/create';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { WorkItemCategoryFilterDto } from '../dtos/work-item-category-filter.dto';
import { WorkItemCategoryDto, WorkSpecialtyOptionDto } from '../dtos/work-item-category.dto';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { WorkItemCategoryService } from '../services/work-item-category.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';

@Component({
  selector: 'app-work-item-category',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkItemCategoryList, WorkItemCategoryCreate, Paginator, SearchSelect, SearchInput],
  templateUrl: './work-item-category.html',
  styleUrl: './work-item-category.css',
})
export class WorkItemCategory implements OnInit {
  @ViewChild(WorkItemCategoryList) list!: WorkItemCategoryList;

  filters: WorkItemCategoryFilterDto = { description: null, hasInstructivo: null, hasClause: null, workSpecialtyId: null, active: null, page: 1 };

  /** Especialidades para el desplegable de filtro. */
  specialties: WorkSpecialtyOptionDto[] = [];

  readonly instructivoOptions = [
    { value: true, label: 'Con instructivo' },
    { value: false, label: 'Sin instructivo' },
  ];

  readonly clauseOptions = [
    { value: true, label: 'Con cláusula' },
    { value: false, label: 'Sin cláusula' },
  ];

  readonly estadoOptions = [
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];

  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  showCreateModal = false;
  syncing = false;

  constructor(
    private service: WorkItemCategoryService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.service.getSpecialties().subscribe({
      next: (res) => (this.specialties = res),
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

  onPagedData(data: PagedResponseDTO<WorkItemCategoryDto>): void {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }

  syncInstructivos(): void {
    this.syncing = true;
    this.loaderService.show();
    this.service.syncInstructivos().subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.syncing = false;
        const createdLine =
          res.created > 0
            ? `<br/><small class="text-blue-500">Creadas: ${res.createdDescriptions.join(', ')}</small>`
            : '';
        const unmatchedLine =
          res.unmatchedDescriptions.length > 0
            ? `<br/><small class="text-gray-400">Sin instructivo: ${res.unmatchedDescriptions.join(', ')}</small>`
            : '';
        Swal.fire({
          icon: 'success',
          title: 'Sincronización completada',
          html: `${res.matched} sincronizadas · ${res.created} creadas · ${res.unmatched} sin match${createdLine}${unmatchedLine}`,
          confirmButtonColor: '#64BC04',
        });
        this.list.load(this.currentPage);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.syncing = false;
        this.errorService.handleError(err);
      },
    });
  }
}
