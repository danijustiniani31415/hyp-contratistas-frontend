import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  VisibilidadAreaNodeDTO,
  VisibilidadAsignacionDTO,
  VisibilidadInicialDTO,
} from '../dtos/visibilidadSalida.model';

@Injectable({ providedIn: 'root' })
export class VisibilidadSalidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/visibilidad-salidas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getInitialData(): Observable<VisibilidadInicialDTO> {
    return this.http.get<VisibilidadInicialDTO>(this.apiUrl, { headers: this.headers });
  }

  getAreaTree(): Observable<VisibilidadAreaNodeDTO[]> {
    return this.http.get<VisibilidadAreaNodeDTO[]>(`${this.apiUrl}/area-scope-tree`, {
      headers: this.headers,
    });
  }

  getWorkerAsignaciones(workerId: number): Observable<VisibilidadAsignacionDTO[]> {
    return this.http.get<VisibilidadAsignacionDTO[]>(`${this.apiUrl}/worker/${workerId}`, {
      headers: this.headers,
    });
  }

  updateWorkerAsignaciones(
    workerId: number,
    areas: VisibilidadAsignacionDTO[],
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/worker/${workerId}`,
      { areas },
      { headers: this.headers },
    );
  }
}
