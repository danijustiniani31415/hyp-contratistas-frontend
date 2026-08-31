import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CostosPresupuestosEmailList } from './list/list';
import { CostosPresupuestosEmailCreate } from './create/create';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { CostosPresupuestosEmailFilterDto } from '../dtos/costos-presupuestos-email-filter.dto';
import { CostosPresupuestosEmailDto } from '../dtos/costos-presupuestos-email.dto';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';

@Component({
  selector: 'app-costos-presupuestos-email',
  standalone: true,
  imports: [CommonModule, FormsModule, CostosPresupuestosEmailList, CostosPresupuestosEmailCreate, Paginator, SearchInput],
  templateUrl: './costos-presupuestos-email.html',
  styleUrl: './costos-presupuestos-email.css',
})
export class CostosPresupuestosEmail implements OnInit {
  @ViewChild(CostosPresupuestosEmailList) list!: CostosPresupuestosEmailList;

  filters: CostosPresupuestosEmailFilterDto = { email: null, page: 1 };

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

  onPagedData(data: PagedResponseDTO<CostosPresupuestosEmailDto>): void {
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalRecords = data.totalRecords;
  }
}
