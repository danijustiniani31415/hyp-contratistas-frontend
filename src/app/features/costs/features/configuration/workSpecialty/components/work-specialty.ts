import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkSpecialtyList } from './list/list';
import { WorkSpecialtyCreate } from './create/create';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { WorkSpecialtyFilterDto } from '../dtos/work-specialty-filter.dto';
import { WorkSpecialtyDto } from '../dtos/work-specialty.dto';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';

@Component({
  selector: 'app-work-specialty',
  standalone: true,
  imports: [CommonModule, FormsModule, WorkSpecialtyList, WorkSpecialtyCreate, Paginator, SearchInput, SearchSelect],
  templateUrl: './work-specialty.html',
  styleUrl: './work-specialty.css',
})
export class WorkSpecialty implements OnInit {
  @ViewChild(WorkSpecialtyList) list!: WorkSpecialtyList;

  filters: WorkSpecialtyFilterDto = { description: null, active: null, page: 1 };

  readonly estadoOptions = [
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];

  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  showCreateModal = false;

  ngOnInit(): void {}

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

  onPagedData(data: PagedResponseDTO<WorkSpecialtyDto>): void {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }
}
