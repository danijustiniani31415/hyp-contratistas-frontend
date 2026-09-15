import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LbAuthService } from '../../../core/services/lb-auth.service';

@Component({
  selector: 'app-restablecer-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './restablecer-password.html',
  styleUrl: '../lb-login.css',
})
export class RestablecerPassword implements OnInit {
  token = '';
  password = '';
  confirmarPassword = '';
  showPassword = false;
  loading = false;
  error = '';
  listo = false;
  tokenAusente = false;

  constructor(private route: ActivatedRoute, private router: Router, private authService: LbAuthService) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.tokenAusente = !this.token;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    this.error = '';
    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.password !== this.confirmarPassword) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.listo = true;
        setTimeout(() => this.router.navigate(['/auth/login']), 2500);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'No se pudo restablecer la contraseña. Intenta de nuevo.';
      },
    });
  }
}
