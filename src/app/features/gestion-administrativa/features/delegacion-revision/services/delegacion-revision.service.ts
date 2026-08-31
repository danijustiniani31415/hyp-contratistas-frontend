import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { DelegacionInicialDTO, DelegacionUpdateDTO } from '../dtos/delegacion.model';

@Injectable({ providedIn: 'root' })
export class DelegacionRevisionService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/delegacion-revision`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga inicial: asignaciones del usuario (área/proyecto) con revisores y opciones (1 petición). */
  getInitialData(): Observable<DelegacionInicialDTO> {
    return this.http.get<DelegacionInicialDTO>(this.apiUrl, { headers: this.headers });
  }

  /** Reemplaza los revisores de una asignación del usuario (área o proyecto si dto.projectId != null). */
  update(areaScopeId: number, dto: DelegacionUpdateDTO): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${areaScopeId}`, dto, {
      headers: this.headers,
    });
  }
}
