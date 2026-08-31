import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertaLoginSsomaResultDto } from '../dtos/ssoma/alerta-login-ssoma.model';

/**
 * Aviso al ingresar para Administradores/Coordinadores SSOMA de proyecto: interconsultas
 * pendientes + EMOs vencidos de los trabajadores actualmente en SUS proyectos. Se calcula en
 * vivo en el backend en cada llamada — cualquier usuario puede invocarlo, si no coincide con
 * ningún proyecto simplemente vuelve `tieneAlertas: false`.
 */
@Injectable({ providedIn: 'root' })
export class AlertaLoginSsomaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/alertas/mi-resumen`;

  constructor(private http: HttpClient) {}

  private get token(): string | null {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  }

  /** Silencioso ante errores: es un aviso de fondo, no debe interrumpir el ingreso. */
  verificar(): Observable<AlertaLoginSsomaResultDto | null> {
    if (!this.token) return of(null);
    return this.http
      .get<AlertaLoginSsomaResultDto>(this.apiUrl, {
        headers: { Authorization: `Bearer ${this.token}` },
      })
      .pipe(catchError(() => of(null)));
  }
}
