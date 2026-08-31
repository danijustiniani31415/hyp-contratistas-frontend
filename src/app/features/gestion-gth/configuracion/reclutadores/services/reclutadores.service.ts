import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ReclutadorDto, ReclutadorToggleResult } from '../dtos/reclutador.dto';

@Injectable({ providedIn: 'root' })
export class ReclutadoresService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/reclutadores`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga de la pantalla: la lista completa en una sola petición. */
  getAll(): Observable<ReclutadorDto[]> {
    return this.http.get<ReclutadorDto[]>(this.apiUrl, { headers: this.headers });
  }

  /** Prende o apaga a un trabajador como reclutador. */
  toggle(workerId: number, activo: boolean): Observable<ReclutadorToggleResult> {
    return this.http.patch<ReclutadorToggleResult>(
      `${this.apiUrl}/${workerId}/toggle`,
      { activo },
      { headers: this.headers },
    );
  }
}
