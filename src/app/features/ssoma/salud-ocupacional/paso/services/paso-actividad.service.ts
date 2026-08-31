import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { buildAuthHeaders } from '../../services/http-base';
import { PasoActividadDto, CreateActividadDto } from '../dtos/paso.dtos';

const ACTIVIDAD_BASE = `${environment.apiUrl}api/v1/ssoma-paso/actividad`;

@Injectable({ providedIn: 'root' })
export class PasoActividadService {
  constructor(private http: HttpClient) {}

  getById(id: number): Observable<PasoActividadDto> {
    return this.http.get<PasoActividadDto>(`${ACTIVIDAD_BASE}/${id}`, { headers: buildAuthHeaders() });
  }

  create(dto: CreateActividadDto): Observable<PasoActividadDto> {
    return this.http.post<PasoActividadDto>(ACTIVIDAD_BASE, dto, { headers: buildAuthHeaders() });
  }

  update(id: number, dto: Partial<CreateActividadDto>): Observable<PasoActividadDto> {
    return this.http.put<PasoActividadDto>(`${ACTIVIDAD_BASE}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  delete(id: number, motivo: string): Observable<void> {
    return this.http.request<void>('DELETE', `${ACTIVIDAD_BASE}/${id}`, {
      body: { motivo },
      headers: buildAuthHeaders(),
    });
  }
}
