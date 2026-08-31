import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import Swal from 'sweetalert2';
import { HolidayService } from '../services/holiday.service';
import { HolidayDto, HolidayEditDto, HolidayTypeSimpleDto } from '../dtos/holiday.model';
import { FeriadoCreate } from './feriado-create';
import { FeriadoEdit } from './feriado-edit';

import { CONFIGURACION_TABS } from '../../../shared/configuracion-tabs';
@Component({
  selector: 'app-feriados',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, AbrilPageHeaderComponent, FeriadoCreate, FeriadoEdit],
  templateUrl: './feriados.html',
})
export class Feriados implements OnInit {
  readonly tabs = CONFIGURACION_TABS;
  readonly pageSize = 10;

  types: HolidayTypeSimpleDto[] = [];
  paged: PagedResponseDTO<HolidayDto> = {
    page: 1,
    pageSize: this.pageSize,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  showCreateModal = false;
  showEditModal = false;
  editDto: HolidayEditDto = {
    holidayId: 0,
    holidayTypeId: 0,
    holidayDate: '',
    description: '',
    recurringYearly: false,
    active: true,
  };

  constructor(
    private service: HolidayService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadInitial(1);
  }

  /** Carga inicial: tipos + primera página en una sola petición. */
  loadInitial(page: number = 1): void {
    this.loaderService.show();
    this.service.getInitial(page, this.pageSize).subscribe({
      next: (res) => {
        this.types = res.types ?? [];
        this.paged = res.holidays;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  /** Solo la tabla (cambios de página) — no vuelve a traer los tipos. */
  load(page: number = 1): void {
    this.loaderService.show();
    this.service.getPaged(page, this.pageSize).subscribe({
      next: (res) => {
        this.paged = res;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  changePage(page: number): void {
    this.load(page);
  }

  /**
   * Para feriados muestra solo día/mes (se repiten cada año);
   * para días no laborables muestra la fecha completa.
   */
  displayDate(item: HolidayDto): string {
    const [y, m, d] = (item.holidayDate ?? '').split('-');
    if (!y || !m || !d) return item.holidayDate ?? '';
    const esFeriado = (item.holidayTypeName ?? '').trim().toLowerCase() === 'feriado';
    return esFeriado ? `${d}/${m}` : `${d}/${m}/${y}`;
  }

  openCreate(): void {
    this.showCreateModal = true;
  }

  onCreated(): void {
    this.showCreateModal = false;
    this.load(this.paged.page || 1);
  }

  openEdit(item: HolidayDto, event: MouseEvent): void {
    event.stopPropagation();
    this.editDto = {
      holidayId: item.holidayId,
      holidayTypeId: item.holidayTypeId,
      holidayDate: item.holidayDate,
      description: item.description,
      recurringYearly: item.recurringYearly,
      active: item.active,
    };
    this.showEditModal = true;
  }

  onEdited(): void {
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
