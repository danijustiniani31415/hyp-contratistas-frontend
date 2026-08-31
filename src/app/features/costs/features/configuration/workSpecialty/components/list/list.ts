import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { WorkSpecialtyService } from '../../services/work-specialty.service';
import { WorkSpecialtyDto } from '../../dtos/work-specialty.dto';
import { WorkSpecialtyEditDto } from '../../dtos/work-specialty-edit.dto';
import { WorkSpecialtyFilterDto } from '../../dtos/work-specialty-filter.dto';
import { WorkSpecialtyEdit } from './edit/edit';
import { PagedResponseDTO } from '../../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-work-specialty-list',
  standalone: true,
  imports: [CommonModule, WorkSpecialtyEdit],
  templateUrl: './list.html',
})
export class WorkSpecialtyList implements OnInit {
  @Input() filters: WorkSpecialtyFilterDto = { page: 1 };
  @Output() pagedData = new EventEmitter<PagedResponseDTO<WorkSpecialtyDto>>();

  items: WorkSpecialtyDto[] = [];
  showEditModal = false;
  editDto: WorkSpecialtyEditDto = { workSpecialtyId: 0, workSpecialtyDescription: '', active: true };

  constructor(
    private service: WorkSpecialtyService,
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

  openEdit(item: WorkSpecialtyDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      workSpecialtyId: item.workSpecialtyId,
      workSpecialtyDescription: item.workSpecialtyDescription,
      active: item.active,
    };
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
