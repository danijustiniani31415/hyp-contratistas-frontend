import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../../shared/components/base-modal/base-modal';
import { CostosPresupuestosEmailService } from '../../../services/costos-presupuestos-email.service';
import { CostosPresupuestosEmailEditDto } from '../../../dtos/costos-presupuestos-email-edit.dto';
import { LoaderService } from '../../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-costos-presupuestos-email-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './edit.html',
})
export class CostosPresupuestosEmailEdit {
  @Input() dto: CostosPresupuestosEmailEditDto = {
    costosPresupuestosEmailId: 0,
    email: '',
    active: true,
  };
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  constructor(
    private service: CostosPresupuestosEmailService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  save(): void {
    if (!this.dto.email.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa un correo electrónico.' });
      return;
    }

    this.loaderService.show();
    this.service.edit(this.dto).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: res.message ?? 'Registro actualizado exitosamente',
          draggable: true,
        });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
