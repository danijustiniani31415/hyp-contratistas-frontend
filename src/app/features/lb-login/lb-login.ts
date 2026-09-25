import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LbAuthService } from '../../core/services/lb-auth.service';

@Component({
  selector: 'app-lb-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './lb-login.html',
  styleUrl: './lb-login.css',
})
/** [REVISADO] loading/error en signals — mismo motivo que personas.ts (Zone.js no parcha
 * fetch() en esta app): un `this.loading = false` dentro de un `.subscribe()` no dispara
 * detección de cambios sola, y el botón se quedaba pegado en "Ingresando..." hasta que algo
 * externo (un click, un scroll) forzaba un tick — confundido con "credenciales colgadas". */
export class LbLogin {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = false;

  constructor(private authService: LbAuthService, private router: Router) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  submit(): void {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/personas']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo iniciar sesión. Intenta de nuevo.');
      },
    });
  }
}
