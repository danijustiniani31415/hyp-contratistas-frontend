import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  GaMotivoSalidaConfigItemDto,
  GaMotivoSalidaCreateDto,
  GaMotivoSalidaEditDto,
} from '../dtos/ga-motivo.dto';

@Injectable({ providedIn: 'root' })
export class GaMotivoSalidaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/motivos`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getAll(): Observable<GaMotivoSalidaConfigItemDto[]> {
    return this.http.get<GaMotivoSalidaConfigItemDto[]>(this.apiUrl, { headers: this.headers });
  }

  create(dto: GaMotivoSalidaCreateDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.apiUrl, dto, { headers: this.headers });
  }

  toggle(id: number): Observable<{ activo: boolean }> {
    return this.http.patch<{ activo: boolean }>(`${this.apiUrl}/${id}/toggle`, {}, { headers: this.headers });
  }

  edit(id: number, dto: GaMotivoSalidaEditDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}`, dto, { headers: this.headers });
  }
}
