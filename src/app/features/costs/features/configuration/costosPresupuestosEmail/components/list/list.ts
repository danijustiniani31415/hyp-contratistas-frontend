import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { CostosPresupuestosEmailService } from '../../services/costos-presupuestos-email.service';
import { CostosPresupuestosEmailDto } from '../../dtos/costos-presupuestos-email.dto';
import { CostosPresupuestosEmailEditDto } from '../../dtos/costos-presupuestos-email-edit.dto';
import { CostosPresupuestosEmailFilterDto } from '../../dtos/costos-presupuestos-email-filter.dto';
import { CostosPresupuestosEmailEdit } from './edit/edit';
import { PagedResponseDTO } from '../../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-costos-presupuestos-email-list',
  standalone: true,
  imports: [CommonModule, CostosPresupuestosEmailEdit],
  templateUrl: './list.html',
})
export class CostosPresupuestosEmailList implements OnInit {
  @Input() filters: CostosPresupuestosEmailFilterDto = { page: 1 };
  @Output() pagedData = new EventEmitter<PagedResponseDTO<CostosPresupuestosEmailDto>>();

  items: CostosPresupuestosEmailDto[] = [];
  showEditModal = false;
  editDto: CostosPresupuestosEmailEditDto = {
    costosPresupuestosEmailId: 0,
    email: '',
    active: true,
  };

  constructor(
    private service: CostosPresupuestosEmailService,
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

  openEdit(item: CostosPresupuestosEmailDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      costosPresupuestosEmailId: item.costosPresupuestosEmailId,
      email: item.email,
      active: item.active,
    };
    this.showEditModal = true;
  }

  toggleActive(item: CostosPresupuestosEmailDto, event: MouseEvent): void {
    event.stopPropagation();
    this.loaderService.show();
    this.service.edit({
      costosPresupuestosEmailId: item.costosPresupuestosEmailId,
      email: item.email,
      active: !item.active,
    }).subscribe({
      next: () => {
        this.loaderService.hide();
        this.load(1);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
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
          Swal.fire({
            icon: 'success',
            title: res.message ?? 'Eliminado correctamente',
            confirmButtonColor: '#64BC04',
          });
          this.load(1);
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
