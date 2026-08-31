import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { EvEvaluacionCreateDto, EvEvaluacionResponseDto } from '../dtos/ev-evaluacion.model';

@Injectable({ providedIn: 'root' })
export class EvEvaluacionService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/residentes`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  crear(dto: EvEvaluacionCreateDto): Observable<any> {
    return this.http.post(this.base, dto, { headers: this.headers() });
  }

  /** Corrige una evaluación ya enviada — solo dentro de las 24h de haberla creado. */
  actualizar(id: number, dto: EvEvaluacionCreateDto): Observable<any> {
    return this.http.put(`${this.base}/${id}`, dto, { headers: this.headers() });
  }

  getMisEvaluaciones(): Observable<EvEvaluacionResponseDto[]> {
    return this.http.get<EvEvaluacionResponseDto[]>(`${this.base}/mis-evaluaciones`, { headers: this.headers() });
  }

  getMiPerfil(): Observable<EvEvaluacionResponseDto[]> {
    return this.http.get<EvEvaluacionResponseDto[]>(`${this.base}/mi-perfil`, { headers: this.headers() });
  }

  getByPeriodo(periodoId: number): Observable<EvEvaluacionResponseDto[]> {
    return this.http.get<EvEvaluacionResponseDto[]>(`${this.base}/periodo/${periodoId}`, { headers: this.headers() });
  }

  getDetalle(id: number): Observable<EvEvaluacionResponseDto> {
    return this.http.get<EvEvaluacionResponseDto>(`${this.base}/${id}`, { headers: this.headers() });
  }

  getResidentesEvaluables(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/residentes-evaluables`, { headers: this.headers() });
  }

  getMiSubarea(): Observable<{ subarea: string }> {
    return this.http.get<{ subarea: string }>(`${this.base}/mi-subarea`, { headers: this.headers() });
  }
}
