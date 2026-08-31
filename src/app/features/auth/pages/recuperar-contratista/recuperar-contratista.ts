import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LoaderService } from '../../../../core/services/loader.service';

@Component({
  selector: 'app-recuperar-contratista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recuperar-contratista.html',
  styleUrl: './recuperar-contratista.css',
})
export class RecuperarContratista {
  email = '';
  saving = false;
  enviado = false;

  private readonly mensajeOk =
    'Si el correo está registrado, recibirás un enlace en breve.';

  constructor(
    private authService: AuthService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  get canSubmit(): boolean {
    return !this.saving && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  submit(): void {
    if (!this.canSubmit) return;
    this.saving = true;
    this.loaderService.show();

    const finalize = () => {
      this.saving = false;
      this.enviado = true;
      this.loaderService.hide();
      this.cdr.detectChanges();
    };

    this.authService.solicitarReset(this.email.trim()).subscribe({
      next: finalize,
      error: finalize, // mismo mensaje — nunca revelar si existe
    });
  }

  get mensajeFinal(): string {
    return this.mensajeOk;
  }
}
