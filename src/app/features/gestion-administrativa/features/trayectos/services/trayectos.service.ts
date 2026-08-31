import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  GaTrayectoCreateDto,
  GaTrayectoEditDto,
  GaTrayectoListItemDto,
  GaTrayectoLugarOptionDto,
} from '../dtos/ga-trayecto.dto';

@Injectable({ providedIn: 'root' })
export class GaTrayectoService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/trayectos`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getAll(): Observable<GaTrayectoListItemDto[]> {
    return this.http.get<GaTrayectoListItemDto[]>(this.apiUrl, { headers: this.headers });
  }

  getLugaresActivos(): Observable<GaTrayectoLugarOptionDto[]> {
    return this.http.get<GaTrayectoLugarOptionDto[]>(`${this.apiUrl}/lugares-activos`, { headers: this.headers });
  }

  create(dto: GaTrayectoCreateDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.apiUrl, dto, { headers: this.headers });
  }

  toggle(id: number): Observable<{ activo: boolean }> {
    return this.http.patch<{ activo: boolean }>(`${this.apiUrl}/${id}/toggle`, {}, { headers: this.headers });
  }

  edit(id: number, dto: GaTrayectoEditDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, dto, { headers: this.headers });
  }
}
