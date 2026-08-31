import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RedirectCommand } from '@angular/router';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule  } from '@angular/forms';
import { AuthService } from "../../../../core/services/auth.service";
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-complete-registration',
  templateUrl: './complete-registration.html',
  imports: [ReactiveFormsModule]
})
export class CompleteRegistration implements OnInit {

  token!: string;

  form!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loaderService: LoaderService,
    private errorService: ErrorService
  ) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  submit() {
    if (this.form.invalid) return;

    const password = this.form.value.password;
    const confirmPassword = this.form.value.confirmPassword;

    const payload = {
      token: this.token,
      password: password,
      confirmPassword: confirmPassword
    };
    this.loaderService.show();
    this.authService.setPassword(payload).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          title: 'Registro completado',
          text: 'Ya puedes iniciar sesión',
          icon: 'success',
          confirmButtonText: 'Ir al login'
        }).then(() => {
          this.router.navigate(['/auth/login']);
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      }
    });
  }
}