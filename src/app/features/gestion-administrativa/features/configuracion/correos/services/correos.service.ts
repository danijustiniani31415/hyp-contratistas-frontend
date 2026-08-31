import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { CorreoConfigInicial, CorreoReglasUpdate } from '../dtos/ga-correo.dto';

@Injectable({ providedIn: 'root' })
export class CorreosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/correos`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga inicial: correos con sus reglas + opciones de los desplegables (1 petición). */
  getInicial(): Observable<CorreoConfigInicial> {
    return this.http.get<CorreoConfigInicial>(this.apiUrl, { headers: this.headers });
  }

  /** Reemplaza las reglas (inclusiones + exclusiones) de un correo por su código. */
  updateReglas(eventoCodigo: string, dto: CorreoReglasUpdate): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/${encodeURIComponent(eventoCodigo)}`,
      dto,
      { headers: this.headers },
    );
  }
}
