import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../../shared/components/search-select/search-select';
import { WorkSpecialtyService } from '../../../services/work-specialty.service';
import { WorkSpecialtyEditDto } from '../../../dtos/work-specialty-edit.dto';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-work-specialty-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './edit.html',
})
export class WorkSpecialtyEdit {
  @Input() dto: WorkSpecialtyEditDto = { workSpecialtyId: 0, workSpecialtyDescription: '', active: true };

  readonly statusOptions = [
    { value: true, label: 'ACTIVO' },
    { value: false, label: 'INACTIVO' },
  ];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  constructor(
    private service: WorkSpecialtyService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  save(): void {
    if (!this.dto.workSpecialtyDescription.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa una descripción.' });
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
