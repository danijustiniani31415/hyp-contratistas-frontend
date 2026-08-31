import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ContractorCredentialsService } from '../services/contractor-credentials.service';

@Component({
  selector: 'app-contractor-credentials',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './contractor-credentials.html',
})
export class ContractorCredentials implements OnInit {
  token = '';
  contributorName = '';
  availableEmails: string[] = [];

  selectedEmail = '';
  customEmail = '';
  useCustomEmail = false;

  password = '';
  passwordConfirm = '';
  showPassword = false;

  loading = true;
  saving = false;
  tokenInvalid = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ContractorCredentialsService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.tokenInvalid = true;
      this.loading = false;
      return;
    }

    this.loaderService.show();
    this.service.validateToken(this.token).subscribe({
      next: (res) => {
        this.loading = false;
        this.loaderService.hide();
        this.contributorName = res.contributorName;
        this.availableEmails = res.emails;
        this.selectedEmail = res.emails[0] ?? '';
      },
      error: () => {
        this.loading = false;
        this.loaderService.hide();
        this.tokenInvalid = true;
        this.cdr.detectChanges();
      },
    });
  }

  get emailToUse(): string {
    return this.useCustomEmail ? this.customEmail : this.selectedEmail;
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
      !this.tokenInvalid &&
      !!this.emailToUse &&
      this.reglasOk &&
      !!this.passwordConfirm &&
      this.password === this.passwordConfirm
    );
  }

  toggleShow(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (!this.canSubmit) return;

    this.saving = true;
    this.loaderService.show();

    this.service
      .create({
        token: this.token,
        email: this.emailToUse,
        password: this.password,
        confirmPassword: this.passwordConfirm,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Cuenta creada',
            text: 'Tus credenciales han sido registradas. Ya puedes iniciar sesión.',
            confirmButtonColor: '#64BC04',
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
