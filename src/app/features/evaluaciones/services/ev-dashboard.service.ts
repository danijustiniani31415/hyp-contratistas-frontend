import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  EvDashboardGerenciaDto,
  EvResidenteResumenDto,
  EvAreaPromedioDto,
  EvTendenciaDto,
  EvPendienteDto,
} from '../dtos/ev-dashboard.model';

@Injectable({ providedIn: 'root' })
export class EvDashboardService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/dashboard`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getGerencia(periodoId?: number): Observable<EvDashboardGerenciaDto> {
    const params = periodoId ? `?periodoId=${periodoId}` : '';
    return this.http.get<EvDashboardGerenciaDto>(`${this.base}/gerencia${params}`, { headers: this.headers() });
  }

  getResidentes(periodoId?: number): Observable<EvResidenteResumenDto[]> {
    const params = periodoId ? `?periodoId=${periodoId}` : '';
    return this.http.get<EvResidenteResumenDto[]>(`${this.base}/residentes${params}`, { headers: this.headers() });
  }

  getAreas(periodoId?: number): Observable<EvAreaPromedioDto[]> {
    const params = periodoId ? `?periodoId=${periodoId}` : '';
    return this.http.get<EvAreaPromedioDto[]>(`${this.base}/areas${params}`, { headers: this.headers() });
  }

  getTendencia(anio?: number): Observable<EvTendenciaDto[]> {
    const params = anio ? `?anio=${anio}` : '';
    return this.http.get<EvTendenciaDto[]>(`${this.base}/tendencia${params}`, { headers: this.headers() });
  }

  getPendientes(periodoId?: number): Observable<EvPendienteDto[]> {
    const params = periodoId ? `?periodoId=${periodoId}` : '';
    return this.http.get<EvPendienteDto[]>(`${this.base}/pendientes${params}`, { headers: this.headers() });
  }
}
