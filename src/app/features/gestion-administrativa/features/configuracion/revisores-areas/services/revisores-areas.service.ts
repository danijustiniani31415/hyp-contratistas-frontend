import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  AreaFiltroProyectoUpdateDTO,
  AreaRevisorInicialDTO,
  AreaRevisoresUpdateDTO,
} from '../dtos/areaRevisor.model';

@Injectable({ providedIn: 'root' })
export class RevisoresAreasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/revisores-areas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga inicial: gerencias y áreas estándar con sus revisores + opciones del selector (1 petición). */
  getInitialData(): Observable<AreaRevisorInicialDTO> {
    return this.http.get<AreaRevisorInicialDTO>(this.apiUrl, { headers: this.headers });
  }

  /** Reemplaza el conjunto completo de revisores del área (o del proyecto si dto.projectId != null). */
  updateRevisores(areaScopeId: number, dto: AreaRevisoresUpdateDTO): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${areaScopeId}`, dto, {
      headers: this.headers,
    });
  }

  /** Marca/desmarca "filtrar por proyecto" para el área. */
  setFiltroProyecto(areaScopeId: number, dto: AreaFiltroProyectoUpdateDTO): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${areaScopeId}/filtro-proyecto`, dto, {
      headers: this.headers,
    });
  }
}
