import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  EvContratistaInicioDto,
  EvContratistaVerInicioDto,
  EvContratistaDashboardDto,
  EvContratistaEvaluacionCreateDto,
  EvContratistaEnvioResultadoDto,
} from '../dtos/ev-contratista.model';

@Injectable({ providedIn: 'root' })
export class EvContratistaService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/contratistas`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getInicio(): Observable<EvContratistaInicioDto> {
    return this.http.get<EvContratistaInicioDto>(`${this.base}/inicio`, { headers: this.headers() });
  }

  getVer(periodoId?: number | null, proyectoId?: number | null): Observable<EvContratistaVerInicioDto> {
    let params = new HttpParams();
    if (periodoId) params = params.set('periodoId', periodoId.toString());
    if (proyectoId) params = params.set('proyectoId', proyectoId.toString());
    return this.http.get<EvContratistaVerInicioDto>(`${this.base}/ver`, { headers: this.headers(), params });
  }

  getDashboard(periodoId?: number | null, proyectoId?: number | null): Observable<EvContratistaDashboardDto> {
    let params = new HttpParams();
    if (periodoId) params = params.set('periodoId', periodoId.toString());
    if (proyectoId) params = params.set('proyectoId', proyectoId.toString());
    return this.http.get<EvContratistaDashboardDto>(`${this.base}/dashboard`, {
      headers: this.headers(),
      params,
    });
  }

  crear(dto: EvContratistaEvaluacionCreateDto): Observable<any> {
    return this.http.post(this.base, dto, { headers: this.headers() });
  }

  marcarNoAplica(motivo: string, proyectoId?: number, contributorId?: number): Observable<any> {
    return this.http.post(
      `${this.base}/no-aplica`,
      { motivo, proyectoId: proyectoId ?? null, contributorId: contributorId ?? null },
      { headers: this.headers() },
    );
  }

  enviarResultados(periodoId: number): Observable<EvContratistaEnvioResultadoDto> {
    const params = new HttpParams().set('periodoId', periodoId.toString());
    return this.http.post<EvContratistaEnvioResultadoDto>(
      `${this.base}/enviar-resultados`,
      null,
      { headers: this.headers(), params },
    );
  }
}
