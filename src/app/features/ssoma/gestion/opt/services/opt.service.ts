import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  OptCatalogosDto,
  OptListQuery,
  OptPagedResult,
  OptDetalleDto,
  OptDashboardDto,
  CrearOptRequest,
} from '../dtos/opt.dtos';

@Injectable({ providedIn: 'root' })
export class OptService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma-opt`;

  constructor(private http: HttpClient) {}

  getCatalogos(): Observable<OptCatalogosDto> {
    return this.http.get<OptCatalogosDto>(`${this.base}/catalogos`);
  }

  getList(q: OptListQuery): Observable<OptPagedResult> {
    let params = new HttpParams();
    for (const [key, val] of Object.entries(q)) {
      if (val !== undefined && val !== null) params = params.set(key, String(val));
    }
    return this.http.get<OptPagedResult>(`${this.base}`, { params });
  }

  getDashboard(proyectoId?: number, anio?: number): Observable<OptDashboardDto> {
    let params = new HttpParams();
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    if (anio) params = params.set('anio', anio);
    return this.http.get<OptDashboardDto>(`${this.base}/dashboard`, { params });
  }

  getDetalle(id: number): Observable<OptDetalleDto> {
    return this.http.get<OptDetalleDto>(`${this.base}/${id}`);
  }

  crearOpt(request: CrearOptRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}`, request);
  }
}
