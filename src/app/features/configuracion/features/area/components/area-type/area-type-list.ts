import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AreaTypeService } from '../../services/area-type.service';
import { AreaTypeDto, AreaTypeEditDto } from '../../dtos/areaType.model';
import { AreaTypeEdit } from './area-type-edit';

@Component({
  selector: 'app-area-type-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AreaTypeEdit],
  templateUrl: './area-type-list.html',
})
export class AreaTypeList implements OnInit {
  @Output() pagedData = new EventEmitter<PagedResponseDTO<AreaTypeDto>>();
  @Output() changed = new EventEmitter<void>();

  paged: PagedResponseDTO<AreaTypeDto> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  editDto: AreaTypeEditDto = { areaTypeId: 0, areaTypeName: '', active: true };
  showEditModal = false;

  constructor(
    private service: AreaTypeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number = 1): void {
    this.loaderService.show();
    this.service.getPaged(page, 10).subscribe({
      next: (res) => {
        this.paged = res;
        this.pagedData.emit(res);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openEdit(item: AreaTypeDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      areaTypeId: item.areaTypeId,
      areaTypeName: item.areaTypeName,
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
    this.changed.emit();
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
          this.changed.emit();
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
