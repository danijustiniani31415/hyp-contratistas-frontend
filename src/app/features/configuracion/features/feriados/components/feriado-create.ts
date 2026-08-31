import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { HolidayService } from '../services/holiday.service';
import { HolidayCreateDto, HolidayTypeSimpleDto } from '../dtos/holiday.model';

@Component({
  selector: 'app-feriado-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './feriado-create.html',
})
export class FeriadoCreate {
  @Input() types: HolidayTypeSimpleDto[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly estadoOptions = [
    { id: true, name: 'ACTIVO' },
    { id: false, name: 'INACTIVO' },
  ];

  dto: HolidayCreateDto = {
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

  get typeOptions() {
    return this.types.map((t) => ({ id: t.holidayTypeId, name: t.holidayTypeName }));
  }

  /** Nombre del tipo seleccionado. */
  get selectedTypeName(): string {
    return this.types.find((t) => t.holidayTypeId === this.dto.holidayTypeId)?.holidayTypeName ?? '';
  }

  /** Un feriado se repite siempre cada año (no se muestra la casilla). */
  get isFeriado(): boolean {
    return this.selectedTypeName.trim().toLowerCase() === 'feriado';
  }

  onTypeChange(id: number): void {
    this.dto.holidayTypeId = id;
    if (this.isFeriado) this.dto.recurringYearly = true;
  }

  save(): void {
    if (!this.dto.holidayTypeId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccione el tipo.' });
      return;
    }
    if (!this.dto.holidayDate) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccione la fecha.' });
      return;
    }
    if (!this.dto.description.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese la descripción.' });
      return;
    }
    if (this.isFeriado) this.dto.recurringYearly = true;
    this.loaderService.show();
    this.service.create(this.dto).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({
          title: res.message ?? 'Registro creado',
          icon: 'success',
          confirmButtonColor: '#64BC04',
        });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
