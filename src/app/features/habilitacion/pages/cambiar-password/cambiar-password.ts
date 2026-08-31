import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { PasswordStrengthComponent } from '../../../../shared/components/password-strength/password-strength';
import { HABILITACION_BASE, buildHabHeaders } from '../../services/http-base';

@Component({
  selector: 'app-hab-cambiar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, PasswordStrengthComponent],
  templateUrl: './cambiar-password.html',
  styleUrl: './cambiar-password.css',
})
export class CambiarPassword {
  passwordActual = '';
  passwordNuevo = '';
  passwordConfirm = '';
  saving = false;

  constructor(
    private http: HttpClient,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  get reglasOk(): boolean {
    if (this.passwordNuevo.length < 8) return false;
    if (!/[A-Z]/.test(this.passwordNuevo)) return false;
    if (!/\d/.test(this.passwordNuevo)) return false;
    return true;
  }

  get passwordMismatch(): boolean {
    return !!this.passwordConfirm && this.passwordNuevo !== this.passwordConfirm;
  }

  get canSubmit(): boolean {
    return (
      !this.saving &&
      !!this.passwordActual &&
      this.reglasOk &&
      this.passwordNuevo === this.passwordConfirm
    );
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Verifica los requisitos de la nueva contraseña.',
      });
      return;
    }

    this.saving = true;
    this.loaderService.show();

    this.http
      .patch<void>(
        `${HABILITACION_BASE}/auth/cambiar-password`,
        { passwordActual: this.passwordActual, passwordNuevo: this.passwordNuevo },
        { headers: buildHabHeaders() },
      )
      .subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          this.passwordActual = '';
          this.passwordNuevo = '';
          this.passwordConfirm = '';
          Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: 'Contraseña actualizada.',
            timer: 1500,
            showConfirmButton: false,
          });
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
  }
}
