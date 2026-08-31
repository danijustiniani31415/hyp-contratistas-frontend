import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../../shared/components/search-select/search-select';
import { StaffProjectEmailService } from '../../../services/staff-project-email.service';
import { StaffProjectEmailEditDto } from '../../../dtos/staff-project-email-edit.dto';
import { StaffProjectEmailFormDataDto } from '../../../dtos/staff-project-email-form-data.dto';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-staff-project-email-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './edit.html',
})
export class StaffProjectEmailEdit {
  @Input() dto: StaffProjectEmailEditDto = { staffProjectEmailId: 0, email: '', staffProjectEmailTypeId: 0, active: true };
  @Input() formData: StaffProjectEmailFormDataDto = { projects: [], types: [] };

  readonly statusOptions = [
    { value: true, label: 'ACTIVO' },
    { value: false, label: 'INACTIVO' },
  ];

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  constructor(
    private service: StaffProjectEmailService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  save(): void {
    if (!this.dto.email.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa un correo electrónico.' });
      return;
    }
    if (!this.dto.staffProjectEmailTypeId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Selecciona el tipo de correo.' });
      return;
    }

    this.loaderService.show();
    this.service.edit(this.dto).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Registro actualizado exitosamente', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
