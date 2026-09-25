import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LbAuthService } from '../../../core/services/lb-auth.service';

/** [REVISADO] loading/error/listo en signals — mismo motivo que personas.ts (Zone.js no parcha
 * fetch() en esta app): un campo de clase plano no dispara detección de cambios dentro de un
 * .subscribe(), y el botón quedaba pegado en "Guardando..." hasta que algo externo forzaba un
 * tick. */
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
  loading = signal(false);
  error = signal('');
  listo = signal(false);
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
    if (this.loading()) return;
    this.error.set('');
    if (this.password.length < 6) {
      this.error.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (this.password !== this.confirmarPassword) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.listo.set(true);
        setTimeout(() => this.router.navigate(['/auth/login']), 2500);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo restablecer la contraseña. Intenta de nuevo.');
      },
    });
  }
}
