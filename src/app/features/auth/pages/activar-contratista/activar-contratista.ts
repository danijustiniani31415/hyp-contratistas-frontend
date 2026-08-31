import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AuthService } from '../../../../core/services/auth.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { PasswordStrengthComponent } from '../../../../shared/components/password-strength/password-strength';

type ActivacionTipo = 'activacion-contratista' | 'reset-contratista' | 'desconocido';

@Component({
  selector: 'app-activar-contratista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PasswordStrengthComponent],
  templateUrl: './activar-contratista.html',
  styleUrl: './activar-contratista.css',
})
export class ActivarContratista implements OnInit {
  token = '';
  tipo: ActivacionTipo = 'desconocido';

  password = '';
  passwordConfirm = '';
  showPassword = false;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    const tipoRaw = (this.route.snapshot.queryParamMap.get('tipo') ?? '').trim();
    if (tipoRaw === 'activacion-contratista' || tipoRaw === 'reset-contratista') {
      this.tipo = tipoRaw;
    }
  }

  get title(): string {
    if (this.tipo === 'reset-contratista') return 'Nueva contraseña';
    if (this.tipo === 'activacion-contratista') return 'Activa tu cuenta';
    return 'Establecer contraseña';
  }

  get subtitle(): string {
    if (this.tipo === 'reset-contratista') {
      return 'Define una nueva contraseña para tu cuenta.';
    }
    return 'Crea tu contraseña para empezar a usar Habilitación SSOMA.';
  }

  get tokenInvalido(): boolean {
    return !this.token || this.tipo === 'desconocido';
  }

  get passwordMismatch(): boolean {
    return !!this.passwordConfirm && this.password !== this.passwordConfirm;
  }

  get reglasOk(): boolean {
    if (this.password.length < 8) return false;
    if (!/[A-Z]/.test(this.password)) return false;
    if (!/\d/.test(this.password)) return false;
    return true;
  }

  get canSubmit(): boolean {
    return (
      !this.saving &&
      !this.tokenInvalido &&
      this.reglasOk &&
      !!this.passwordConfirm &&
      this.password === this.passwordConfirm
    );
  }

  toggleShow(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Verifica los requisitos de la contraseña.',
      });
      return;
    }

    this.saving = true;
    this.loaderService.show();

    if (this.tipo === 'activacion-contratista') {
      this.authService.activarCuenta({ token: this.token, password: this.password }).subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Cuenta activada',
            text: 'Bienvenido a Habilitación SSOMA.',
            timer: 1800,
            showConfirmButton: false,
          }).then(() => {
            const modulos = this.authService.getContratistaModulos();
            const landing = modulos === 'SSOMA' ? '/ssoma/gestion/rac/dashboard' : '/habilitacion/trabajadores';
            this.router.navigate([landing]);
          });
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
      return;
    }

    if (this.tipo === 'reset-contratista') {
      this.authService
        .resetPassword({ token: this.token, nuevaPassword: this.password })
        .subscribe({
          next: () => {
            this.saving = false;
            this.loaderService.hide();
            Swal.fire({
              icon: 'success',
              title: 'Contraseña actualizada',
              text: 'Ya puedes iniciar sesión con tu nueva contraseña.',
              confirmButtonColor: '#64bc04',
            }).then(() => this.router.navigate(['/auth/login']));
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
}
