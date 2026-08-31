import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { WorkItemService } from '../../services/work-item.service';
import { WorkItemDto, WorkItemValorizationFormDto } from '../../dtos/work-item.dto';
import { WorkItemEditDto } from '../../dtos/work-item-edit.dto';
import { WorkItemFilterDto } from '../../dtos/work-item-filter.dto';
import { WorkItemEdit } from './edit/edit';
import { PagedResponseDTO } from '../../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-work-item-list',
  standalone: true,
  imports: [CommonModule, WorkItemEdit],
  templateUrl: './list.html',
})
export class WorkItemList implements OnInit {
  @Input() filters: WorkItemFilterDto = { page: 1 };
  @Output() pagedData = new EventEmitter<PagedResponseDTO<WorkItemDto>>();

  items: WorkItemDto[] = [];
  showEditModal = false;
  editDto: WorkItemEditDto = { workItemId: 0, workItemDescription: '', workItemCategoryId: null, active: true, valorizationForms: [] };
  editingForms: WorkItemValorizationFormDto[] = [];

  constructor(
    private service: WorkItemService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.load(1));
  }

  load(page: number = 1): void {
    this.loaderService.show();
    this.service.getPaged({ ...this.filters, page }).subscribe({
      next: (res) => {
        this.items = res.data;
        this.pagedData.emit(res);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openEdit(item: WorkItemDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      workItemId: item.workItemId,
      workItemDescription: item.workItemDescription,
      workItemCategoryId: item.workItemCategoryId ?? null,
      active: item.active,
      valorizationForms: [],
    };
    this.editingForms = item.valorizationForms ?? [];
    this.showEditModal = true;
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
        next: (res) => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: res.message ?? 'Eliminado correctamente', confirmButtonColor: '#64BC04' });
          this.load(1);
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
