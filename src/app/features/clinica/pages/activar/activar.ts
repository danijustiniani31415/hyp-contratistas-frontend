import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-clinica-activar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activar.html',
  styleUrls: ['./activar.css'],
})
export class ActivarClinica implements OnInit {
  token = '';
  password = '';
  confirmar = '';
  loading = false;
  exito = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  get passwordsCoinciden(): boolean {
    return this.password === this.confirmar && this.password.length >= 8;
  }

  submit(): void {
    this.loading = true;
    this.error = '';
    const token =
      typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    this.http
      .post(
        `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/auth/activar`,
        { token: this.token, password: this.password },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          responseType: 'json' as const,
        },
      )
      .pipe(timeout(15000))
      .subscribe({
        next: () => {
          this.exito = true;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.message ?? 'Error al activar la cuenta.';
        },
      });
  }
}
