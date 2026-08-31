import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { EvPeriodoDto } from '../dtos/ev-periodo.model';

@Injectable({ providedIn: 'root' })
export class EvPeriodoService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/periodos`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getActivo(): Observable<EvPeriodoDto> {
    return this.http.get<EvPeriodoDto>(`${this.base}/activo`, { headers: this.headers() });
  }

  getUltimo(): Observable<EvPeriodoDto> {
    return this.http.get<EvPeriodoDto>(`${this.base}/ultimo`, { headers: this.headers() });
  }

  getAll(): Observable<EvPeriodoDto[]> {
    return this.http.get<EvPeriodoDto[]>(this.base, { headers: this.headers() });
  }

  activar(id: number): Observable<any> {
    return this.http.put(`${this.base}/${id}/activar`, {}, { headers: this.headers() });
  }

  crear(dto: any): Observable<any> {
    return this.http.post(this.base, dto, { headers: this.headers() });
  }
}
