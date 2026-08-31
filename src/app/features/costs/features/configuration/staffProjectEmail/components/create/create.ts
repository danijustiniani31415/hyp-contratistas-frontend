import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { StaffProjectEmailService } from '../../services/staff-project-email.service';
import { StaffProjectEmailCreateDto } from '../../dtos/staff-project-email-create.dto';
import { StaffProjectEmailFormDataDto } from '../../dtos/staff-project-email-form-data.dto';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-staff-project-email-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './create.html',
})
export class StaffProjectEmailCreate {
  @Input() formData: StaffProjectEmailFormDataDto = { projects: [], types: [] };
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  dto: StaffProjectEmailCreateDto = { projectId: 0, email: '', staffProjectEmailTypeId: 0 };

  constructor(
    private service: StaffProjectEmailService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  save(): void {
    if (!this.dto.projectId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Selecciona un proyecto.' });
      return;
    }
    if (!this.dto.email.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa un correo electrónico.' });
      return;
    }
    if (!this.dto.staffProjectEmailTypeId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Selecciona el tipo de correo.' });
      return;
    }

    this.loaderService.show();
    this.service.create(this.dto).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Registro creado exitosamente', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
