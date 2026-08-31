import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  EvGestionSsomaInicioDto,
  EvGestionSsomaEvaluacionCreateDto,
  EvGestionSsomaResultadosDto,
  EvGestionSsomaCumplimientoDto,
} from '../dtos/ev-gestion-ssoma.model';

@Injectable({ providedIn: 'root' })
export class EvGestionSsomaService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/gestion-ssoma`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getInicio(): Observable<EvGestionSsomaInicioDto> {
    return this.http.get<EvGestionSsomaInicioDto>(`${this.base}/inicio`, { headers: this.headers() });
  }

  crear(dto: EvGestionSsomaEvaluacionCreateDto): Observable<any> {
    return this.http.post(this.base, dto, { headers: this.headers() });
  }

  getResultados(periodoId?: number): Observable<EvGestionSsomaResultadosDto> {
    const params: Record<string, string> = periodoId ? { periodoId: String(periodoId) } : {};
    return this.http.get<EvGestionSsomaResultadosDto>(`${this.base}/resultados`, { headers: this.headers(), params });
  }

  getPendientes(periodoId?: number): Observable<EvGestionSsomaCumplimientoDto> {
    const params: Record<string, string> = periodoId ? { periodoId: String(periodoId) } : {};
    return this.http.get<EvGestionSsomaCumplimientoDto>(`${this.base}/pendientes`, { headers: this.headers(), params });
  }
}
