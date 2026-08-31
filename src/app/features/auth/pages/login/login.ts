import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { MicrosoftAuthService } from './services/microsoft-auth.service';
import Swal from 'sweetalert2';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../../../core/services/loader.service';
import { LearningService } from '../../../../core/learning/learning.service';
import { LearningVideoDto } from '../../../../core/learning/learning.model';
import { RETURN_URL_PARAM, ReturnUrlService } from '../../../../core/auth/return-url.service';

type LoginTab = 'abril' | 'contratistas' | 'clinica';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  /** Videos de contratistas del modal (se cargan del backend, superficie LOGIN). */
  tutorialVideos: LearningVideoDto[] = [];
  /** Evita volver a pedir los videos al backend cada vez que se reabre el modal. */
  private tutorialesCargados = false;

  token!: string;
  form!: FormGroup;
  contratistaForm!: FormGroup;

  /**
   * URL a la que el usuario intentaba llegar antes de que lo mandáramos al login
   * (la adjunta el `authGuard` como `?returnUrl=`). Si viene, manda sobre el
   * landing por defecto de cada tipo de sesión.
   */
  private returnUrl: string | null = null;

  activeTab: LoginTab = 'abril';
  mostrarTutoriales = false;
  showContratistaPassword = false;
  clinicaForm = { email: '', password: '' };
  clinicaLoading = false;
  clinicaError = '';

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private authService: AuthService,
    private microsoftAuthService: MicrosoftAuthService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
    private learningService: LearningService,
    private returnUrlService: ReturnUrlService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.returnUrl = this.route.snapshot.queryParamMap.get(RETURN_URL_PARAM);

    this.form = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required],
    });
    this.contratistaForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  setTab(tab: LoginTab): void {
    this.activeTab = tab;
  }

  toggleTutoriales(): void {
    this.mostrarTutoriales = !this.mostrarTutoriales;
    // App zoneless: forzamos el refresco para que el modal abra/cierre sin un click extra.
    this.cdr.detectChanges();
    // Los videos se traen recién al abrir el modal (no bloquea el login), y solo una vez.
    if (this.mostrarTutoriales && !this.tutorialesCargados) {
      this.cargarTutoriales();
    }
  }

  /** Carga los videos tutoriales bajo demanda al abrir el modal, con spinner global. */
  private cargarTutoriales(): void {
    this.loaderService.show();
    // Se aplanan los grupos: en el login solo existe la categoría de contratistas.
    this.learningService.getLogin().subscribe({
      next: (cats) => {
        this.tutorialVideos = cats.flatMap((c) => c.videos);
        this.tutorialesCargados = true;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: () => {
        this.tutorialVideos = [];
        this.tutorialesCargados = true;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
    });
  }

  toggleContratistaPassword(): void {
    this.showContratistaPassword = !this.showContratistaPassword;
  }

  submitClinica(): void {
    this.clinicaLoading = true;
    this.clinicaError = '';
    this.authService.loginClinica(this.clinicaForm.email, this.clinicaForm.password).subscribe({
      next: (data) => {
        this.authService.persistClinicaToken(data);
        this.returnUrlService.navigateAfterLogin(this.returnUrl, '/clinica/agenda');
      },
      error: () => {
        this.clinicaLoading = false;
        this.clinicaError = 'Credenciales inválidas.';
      },
    });
  }

  submit() {
    this.loaderService.show();
    this.cdr.detectChanges();
    if (this.form.invalid) return;

    const payload = { email: this.form.value.email, password: this.form.value.password };
    this.authService.login(payload).subscribe({
      next: () => {
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.returnUrlService.navigateAfterLogin(this.returnUrl, '/');
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  submitContratista() {
    if (this.contratistaForm.invalid) return;
    this.loaderService.show();
    this.cdr.detectChanges();

    const { email, password } = this.contratistaForm.value;
    this.authService.loginContratista(email.trim(), password).subscribe({
      next: () => {
        this.loaderService.hide();
        this.cdr.detectChanges();
        // Si el contratista solo tiene acceso a SSOMA, no debe aterrizar en el
        // panel de Gestión de Ingresos (que no le corresponde ver).
        const modulos = this.authService.getContratistaModulos();
        const landing = modulos === 'SSOMA' ? '/ssoma/gestion/rac/dashboard' : '/habilitacion';
        this.returnUrlService.navigateAfterLogin(this.returnUrl, landing);
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  async submitMicrosoft() {
    this.loaderService.show();
    this.cdr.detectChanges();
    try {
      await this.microsoftAuthService.login();
      this.loaderService.hide();
      this.cdr.detectChanges();
      // Los trabajadores de Abril (USUARIO DE ABRIL) aterrizan en el boletín;
      // el resto en el inicio real (panel de accesos). Salvo que venga un
      // returnUrl: ahí manda a dónde iba (p. ej. el correo de aprobación de
      // Gerencia, que apunta a una solicitud concreta).
      this.returnUrlService.navigateAfterLogin(
        this.returnUrl,
        this.authService.esUsuarioAbrilBoletin() ? '/boletin' : '/',
      );
    } catch (err: any) {
      this.loaderService.hide();
      this.cdr.detectChanges();
      // El usuario cerró el popup — no mostrar error
      if (['user_cancelled', 'popup_window_error', 'timed_out'].includes(err?.errorCode)) return;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message ?? 'No se pudo iniciar sesión con Microsoft.',
      });
    }
  }

  error(err: HttpErrorResponse) {
    this.loaderService.hide();
    this.cdr.detectChanges();

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: err.error?.message ?? 'Credenciales inválidas',
      });
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }
  }
}
