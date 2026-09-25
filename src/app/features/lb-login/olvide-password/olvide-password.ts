import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LbAuthService } from '../../../core/services/lb-auth.service';

/** [REVISADO] loading/enviado/error en signals — mismo motivo que personas.ts (Zone.js no
 * parcha fetch() en esta app): un campo de clase plano no dispara detección de cambios dentro
 * de un .subscribe(), y el botón quedaba pegado en "Enviando..." hasta que algo externo forzaba
 * un tick. */
@Component({
  selector: 'app-olvide-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './olvide-password.html',
  styleUrl: '../lb-login.css',
})
export class OlvidePassword {
  email = '';
  loading = signal(false);
  enviado = signal(false);
  error = signal('');

  constructor(private authService: LbAuthService) {}

  submit(): void {
    if (!this.email || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.authService.solicitarReset(this.email).subscribe({
      // El backend responde 200 con el mismo mensaje exista o no la cuenta — nunca hay nada
      // que distinguir en el "next". Un error real acá solo puede ser límite de intentos (429)
      // o una falla genuina del servidor, no "el correo no existe".
      next: () => {
        this.loading.set(false);
        this.enviado.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 429) {
          this.error.set(err?.error?.message ?? 'Has hecho demasiados intentos. Espera un momento y vuelve a intentar.');
        } else {
          // Mismo mensaje "genérico" que el 200 — no revela si fue un fallo real o el correo
          // no existe, para no dar más pistas de las que ya da el backend.
          this.enviado.set(true);
        }
      },
    });
  }
}
