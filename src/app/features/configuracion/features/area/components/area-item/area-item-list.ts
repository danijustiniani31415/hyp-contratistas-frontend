import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AreaItemService } from '../../services/area-item.service';
import { AreaTypeService } from '../../services/area-type.service';
import { AreaItemDto, AreaItemEditDto } from '../../dtos/areaItem.model';
import { AreaTypeSimpleDto } from '../../dtos/areaType.model';
import { AreaItemEdit } from './area-item-edit';

@Component({
  selector: 'app-area-item-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, AreaItemEdit],
  templateUrl: './area-item-list.html',
})
export class AreaItemList implements OnInit {
  @Output() pagedData = new EventEmitter<PagedResponseDTO<AreaItemDto>>();

  paged: PagedResponseDTO<AreaItemDto> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  // Filtros
  filterTypeId: number | null = null;
  filterActive: boolean | null = null;
  searchText: string = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  areaTypes: AreaTypeSimpleDto[] = [];

  readonly activeOptions = [
    { id: true, name: 'ACTIVO' },
    { id: false, name: 'INACTIVO' },
  ];

  editDto: AreaItemEditDto = {
    areaItemId: 0,
    areaItemName: '',
    areaTypeId: 0,
    active: true,
  };
  showEditModal = false;

  constructor(
    private service: AreaItemService,
    private areaTypeService: AreaTypeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadAreaTypes();
    this.load(1);
  }

  loadAreaTypes(): void {
    this.loaderService.show();
    this.areaTypeService.getSimple().subscribe({
      next: (data) => {
        this.areaTypes = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  load(page: number = 1): void {
    this.loaderService.show();
    this.service
      .getPaged({
        page,
        pageSize: 10,
        areaTypeId: this.filterTypeId,
        active: this.filterActive,
        search: this.searchText.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.paged = res;
          this.pagedData.emit(res);
          this.loaderService.hide();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  onFilterChange(): void {
    this.load(1);
  }

  onSearchChange(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.load(1), 300);
  }

  openEdit(item: AreaItemDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      areaItemId: item.areaItemId,
      areaItemName: item.areaItemName,
      areaTypeId: item.areaTypeId,
      active: item.active,
    };
    this.showEditModal = true;
  }

  onEditClosed(): void {
    this.showEditModal = false;
  }

  onEditSaved(): void {
    this.showEditModal = false;
    this.load(this.paged.page || 1);
  }

  delete(id: number, event: MouseEvent): void {
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
      this.loaderService.show();
      this.service.delete(id).subscribe({
        next: (res: ApiMessageDTO) => {
          this.loaderService.hide();
          this.load(this.paged.page || 1);
          Swal.fire({
            title: '¡Eliminado!',
            text: res.message ?? 'El registro ha sido eliminado.',
            icon: 'success',
            confirmButtonColor: '#64BC04',
          });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
