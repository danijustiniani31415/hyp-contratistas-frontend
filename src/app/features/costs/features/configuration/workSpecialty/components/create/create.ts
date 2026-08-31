import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { WorkSpecialtyService } from '../../services/work-specialty.service';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-work-specialty-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './create.html',
})
export class WorkSpecialtyCreate {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  description = '';

  constructor(
    private service: WorkSpecialtyService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  save(): void {
    if (!this.description.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa una descripción.' });
      return;
    }

    this.loaderService.show();
    this.service.create({ workSpecialtyDescription: this.description.trim() }).subscribe({
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
