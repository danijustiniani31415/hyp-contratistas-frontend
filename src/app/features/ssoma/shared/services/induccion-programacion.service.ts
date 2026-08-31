import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ProgramacionInduccionDTO,
  ProyectoSimpleInduccionDTO,
  ResponsableProyectoDTO,
  RotacionProyectoDTO,
  RotacionReordenarItemDTO,
} from '../dtos/induccion-programacion.dtos';

@Injectable({ providedIn: 'root' })
export class InduccionProgramacionService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/induccion-programacion`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  getProyectosDisponibles(): Observable<ProyectoSimpleInduccionDTO[]> {
    return this.http.get<ProyectoSimpleInduccionDTO[]>(`${this.base}/proyectos-disponibles`, {
      headers: this.authHeaders(),
    });
  }

  getResponsablesDisponibles(proyectoId: number): Observable<ResponsableProyectoDTO[]> {
    return this.http.get<ResponsableProyectoDTO[]>(`${this.base}/responsables-disponibles`, {
      headers: this.authHeaders(),
      params: { proyectoId },
    });
  }

  getRotacion(): Observable<RotacionProyectoDTO[]> {
    return this.http.get<RotacionProyectoDTO[]>(`${this.base}/rotacion`, {
      headers: this.authHeaders(),
    });
  }

  agregarARotacion(proyectoId: number, responsableWorkerId: number | null): Observable<RotacionProyectoDTO> {
    return this.http.post<RotacionProyectoDTO>(
      `${this.base}/rotacion`,
      { proyectoId, responsableWorkerId },
      { headers: this.authHeaders() },
    );
  }

  setResponsable(id: number, responsableWorkerId: number | null): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/rotacion/${id}/responsable`,
      { responsableWorkerId },
      { headers: this.authHeaders() },
    );
  }

  reordenar(items: RotacionReordenarItemDTO[]): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/rotacion/reordenar`,
      { items },
      { headers: this.authHeaders() },
    );
  }

  setActivo(id: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/rotacion/${id}/activo`,
      { activo },
      { headers: this.authHeaders() },
    );
  }

  getCalendario(desde: string, hasta: string): Observable<ProgramacionInduccionDTO[]> {
    return this.http.get<ProgramacionInduccionDTO[]>(this.base + '/calendario', {
      headers: this.authHeaders(),
      params: { desde, hasta },
    });
  }

  reasignar(id: number, proyectoId: number, motivo?: string): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/calendario/${id}/reasignar`,
      { proyectoId, motivo },
      { headers: this.authHeaders() },
    );
  }

  cancelar(id: number, motivo?: string): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/calendario/${id}/cancelar`,
      { motivo },
      { headers: this.authHeaders() },
    );
  }

  reprogramar(id: number, nuevaFecha: string, motivo?: string): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/calendario/${id}/reprogramar`,
      { nuevaFecha, motivo },
      { headers: this.authHeaders() },
    );
  }

  setProgramacionResponsable(id: number, responsableWorkerId: number | null): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/calendario/${id}/responsable`,
      { responsableWorkerId },
      { headers: this.authHeaders() },
    );
  }
}
