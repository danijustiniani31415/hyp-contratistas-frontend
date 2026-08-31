import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  EvPrevencionistaInicioDto,
  EvPrevencionistaEvaluacionCreateDto,
  EvPrevencionistaMiPerfilDto,
  EvPrevencionistaDashboardDto,
} from '../dtos/ev-prevencionista.model';

@Injectable({ providedIn: 'root' })
export class EvPrevencionistaService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/prevencionistas`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getInicio(): Observable<EvPrevencionistaInicioDto> {
    return this.http.get<EvPrevencionistaInicioDto>(`${this.base}/inicio`, { headers: this.headers() });
  }

  crear(dto: EvPrevencionistaEvaluacionCreateDto): Observable<any> {
    return this.http.post(this.base, dto, { headers: this.headers() });
  }

  getMiPerfil(periodoId?: number | null): Observable<EvPrevencionistaMiPerfilDto> {
    let params = new HttpParams();
    if (periodoId) params = params.set('periodoId', periodoId.toString());
    return this.http.get<EvPrevencionistaMiPerfilDto>(`${this.base}/mi-perfil`, { headers: this.headers(), params });
  }

  getDashboard(periodoId?: number | null, proyectoId?: number | null): Observable<EvPrevencionistaDashboardDto> {
    let params = new HttpParams();
    if (periodoId) params = params.set('periodoId', periodoId.toString());
    if (proyectoId) params = params.set('proyectoId', proyectoId.toString());
    return this.http.get<EvPrevencionistaDashboardDto>(`${this.base}/dashboard`, { headers: this.headers(), params });
  }
}
