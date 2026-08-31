import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  EvSupervisorContratistaInicioDto,
  EvSupervisorContratistaVerInicioDto,
  EvSupervisorContratistaDashboardDto,
  EvSupervisorContratistaEvaluacionCreateDto,
  EvSupervisorContratistaMiPerfilDto,
} from '../dtos/ev-supervisor-contratista.model';

@Injectable({ providedIn: 'root' })
export class EvSupervisorContratistaService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/supervisores-contratista`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getInicio(): Observable<EvSupervisorContratistaInicioDto> {
    return this.http.get<EvSupervisorContratistaInicioDto>(`${this.base}/inicio`, { headers: this.headers() });
  }

  getVer(periodoId?: number | null, proyectoId?: number | null): Observable<EvSupervisorContratistaVerInicioDto> {
    let params = new HttpParams();
    if (periodoId) params = params.set('periodoId', periodoId.toString());
    if (proyectoId) params = params.set('proyectoId', proyectoId.toString());
    return this.http.get<EvSupervisorContratistaVerInicioDto>(`${this.base}/ver`, { headers: this.headers(), params });
  }

  getDashboard(periodoId?: number | null, proyectoId?: number | null): Observable<EvSupervisorContratistaDashboardDto> {
    let params = new HttpParams();
    if (periodoId) params = params.set('periodoId', periodoId.toString());
    if (proyectoId) params = params.set('proyectoId', proyectoId.toString());
    return this.http.get<EvSupervisorContratistaDashboardDto>(`${this.base}/dashboard`, {
      headers: this.headers(),
      params,
    });
  }

  getMiPerfil(periodoId?: number | null): Observable<EvSupervisorContratistaMiPerfilDto> {
    let params = new HttpParams();
    if (periodoId) params = params.set('periodoId', periodoId.toString());
    return this.http.get<EvSupervisorContratistaMiPerfilDto>(`${this.base}/mi-perfil`, {
      headers: this.headers(),
      params,
    });
  }

  crear(dto: EvSupervisorContratistaEvaluacionCreateDto): Observable<any> {
    return this.http.post(this.base, dto, { headers: this.headers() });
  }

  actualizar(id: number, dto: EvSupervisorContratistaEvaluacionCreateDto): Observable<any> {
    return this.http.put(`${this.base}/${id}`, dto, { headers: this.headers() });
  }

  marcarNoAplica(motivo: string, proyectoId?: number, supervisorSsContratistaUsuarioId?: number): Observable<any> {
    return this.http.post(
      `${this.base}/no-aplica`,
      { motivo, proyectoId: proyectoId ?? null, supervisorSsContratistaUsuarioId: supervisorSsContratistaUsuarioId ?? null },
      { headers: this.headers() },
    );
  }
}
