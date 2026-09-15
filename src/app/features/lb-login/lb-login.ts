import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LbAuthService } from '../../core/services/lb-auth.service';

@Component({
  selector: 'app-lb-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lb-login.html',
  styleUrl: './lb-login.css',
})
export class LbLogin {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private authService: LbAuthService, private router: Router) {}

  submit(): void {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error = '';
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/personas']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'No se pudo iniciar sesión. Intenta de nuevo.';
      },
    });
  }
}
