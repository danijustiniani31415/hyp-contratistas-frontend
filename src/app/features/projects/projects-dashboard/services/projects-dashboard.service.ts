import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ProjectsDashboardResponseDto,
  ProjectsDashboardFiltersDTO,
  ProyectoDetalleDTO,
} from '../dtos/projectsDashboard.model';

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ProjectsDashboardParams {
  proyectoId?: number | null;
  estado?: string;
  responsableId?: number | null;
  fechaDesde?: string;
  fechaHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectsDashboardService {
  private readonly base = `${environment.apiUrl}api/v1/projects-dashboard`;

  constructor(private http: HttpClient) {}

  getFilters(): Observable<ProjectsDashboardFiltersDTO> {
    return this.http.get<ProjectsDashboardFiltersDTO>(`${this.base}/filters`, {
      headers: buildAuthHeaders(),
    });
  }

  getDashboard(params: ProjectsDashboardParams): Observable<ProjectsDashboardResponseDto> {
    let httpParams = new HttpParams();
    if (params.proyectoId) httpParams = httpParams.set('proyectoId', String(params.proyectoId));
    if (params.estado) httpParams = httpParams.set('estado', params.estado);
    if (params.responsableId)
      httpParams = httpParams.set('responsableId', String(params.responsableId));
    if (params.fechaDesde) httpParams = httpParams.set('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) httpParams = httpParams.set('fechaHasta', params.fechaHasta);
    return this.http.get<ProjectsDashboardResponseDto>(this.base, {
      headers: buildAuthHeaders(),
      params: httpParams,
    });
  }

  getProjectDetail(proyectoId: number): Observable<ProyectoDetalleDTO> {
    return this.http.get<ProyectoDetalleDTO>(`${this.base}/${proyectoId}`, {
      headers: buildAuthHeaders(),
    });
  }
}
