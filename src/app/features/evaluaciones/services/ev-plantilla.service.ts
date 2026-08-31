import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { EvPlantillaDto, EvPlantillaCreateDto, EvPlantillaUpdateDto } from '../dtos/ev-plantilla.model';

@Injectable({ providedIn: 'root' })
export class EvPlantillaService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/plantilla`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getAll(): Observable<EvPlantillaDto[]> {
    return this.http.get<EvPlantillaDto[]>(this.base, { headers: this.headers() });
  }

  getAreas(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/areas`, { headers: this.headers() });
  }

  getByArea(area: string): Observable<EvPlantillaDto[]> {
    return this.http.get<EvPlantillaDto[]>(`${this.base}/${encodeURIComponent(area)}`, { headers: this.headers() });
  }

  crear(dto: EvPlantillaCreateDto): Observable<any> {
    return this.http.post(this.base, dto, { headers: this.headers() });
  }

  actualizar(id: number, dto: EvPlantillaUpdateDto): Observable<any> {
    return this.http.put(`${this.base}/${id}`, dto, { headers: this.headers() });
  }
}
