import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../../environments/environment';
import { PasswordStrengthComponent } from '../../../../shared/components/password-strength/password-strength';

@Component({
  selector: 'app-activar-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PasswordStrengthComponent],
  templateUrl: './activar-empresa.component.html',
  styleUrl: './activar-empresa.component.css',
})
export class ActivarEmpresaComponent {
  paso = 1;

  ruc = '';
  spPassword = '';
  nombreComercial = '';

  email = '';
  password = '';
  confirmarPassword = '';
  showPassword = false;

  saving = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  get rucInvalido(): boolean {
    return !/^\d{11}$/.test(this.ruc);
  }

  get passwordMismatch(): boolean {
    return !!this.confirmarPassword && this.password !== this.confirmarPassword;
  }

  get reglasOk(): boolean {
    return this.password.length >= 8 && /[A-Z]/.test(this.password) && /\d/.test(this.password);
  }

  get canSubmitPaso1(): boolean {
    return !this.saving && !this.rucInvalido && !!this.spPassword;
  }

  get canSubmitPaso2(): boolean {
    return (
      !this.saving &&
      !!this.email &&
      this.reglasOk &&
      !!this.confirmarPassword &&
      this.password === this.confirmarPassword
    );
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  submitPaso1(): void {
    if (!this.canSubmitPaso1) return;

    this.saving = true;
    this.http
      .post<{ nombreComercial: string }>(
        `${environment.apiUrl}api/v1/habilitacion/auth/validar-migracion`,
        { ruc: this.ruc, spPassword: this.spPassword },
      )
      .subscribe({
        next: (res) => {
          this.nombreComercial = res.nombreComercial;
          this.paso = 2;
          this.saving = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          Swal.fire({
            icon: 'error',
            title: 'Error de verificación',
            text: err.error?.message ?? 'RUC o contraseña temporal incorrectos',
          });
        },
      });
  }

  submitPaso2(): void {
    if (this.password !== this.confirmarPassword) {
      Swal.fire({ icon: 'warning', title: 'Las contraseñas no coinciden' });
      return;
    }
    if (!this.canSubmitPaso2) return;

    this.saving = true;
    this.http
      .post(`${environment.apiUrl}api/v1/habilitacion/auth/activar-migracion`, {
        ruc: this.ruc,
        spPassword: this.spPassword,
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          Swal.fire({
            icon: 'success',
            title: 'Cuenta activada',
            text: 'Tu cuenta ha sido activada exitosamente.',
            confirmButtonColor: '#64bc04',
          }).then(() => this.router.navigate(['/auth/login']));
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.message ?? 'No se pudo activar la cuenta.',
          });
        },
      });
  }
}
