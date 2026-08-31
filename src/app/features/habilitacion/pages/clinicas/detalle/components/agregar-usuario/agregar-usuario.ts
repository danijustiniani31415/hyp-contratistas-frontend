import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { ClinicaUsuarioService } from '../../../../../services/clinica-usuario.service';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-agregar-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './agregar-usuario.html',
  styleUrl: './agregar-usuario.css',
})
export class AgregarUsuario {
  @Input() clinicaId!: number;
  @Output() closeModal = new EventEmitter<void>();
  @Output() usuarioCreado = new EventEmitter<void>();

  nombre = '';
  email = '';
  saving = false;

  constructor(
    private clinicaUsuarioService: ClinicaUsuarioService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  guardar(): void {
    if (!this.nombre.trim() || !this.email.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nombre y email son requeridos' });
      return;
    }
    this.saving = true;
    this.loaderService.show();
    this.clinicaUsuarioService
      .crearUsuario(this.clinicaId, { nombre: this.nombre.trim(), email: this.email.trim() })
      .subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Usuario creado', timer: 1500, showConfirmButton: false });
          this.usuarioCreado.emit();
          this.closeModal.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
