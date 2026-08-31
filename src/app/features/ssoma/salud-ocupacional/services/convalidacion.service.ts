import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders, buildParams } from './http-base';
import { ConvalidacionCreateDto, ConvalidacionListDto } from '../dtos/convalidacion.model';

export interface ConvalidacionQueryParams {
  workerId?: number;
  empresaDestinoId?: number;
  proyectoId?: number;
  tipoEmoId?: number;
  resultado?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class ConvalidacionService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/convalidaciones`;

  constructor(private http: HttpClient) {}

  getConvalidaciones(
    query: ConvalidacionQueryParams = {},
  ): Observable<PagedResponseDTO<ConvalidacionListDto>> {
    return this.http.get<PagedResponseDTO<ConvalidacionListDto>>(this.apiUrl, {
      params: buildParams(query as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  getConvalidacion(id: number): Observable<ConvalidacionListDto> {
    return this.http.get<ConvalidacionListDto>(`${this.apiUrl}/${id}`, {
      headers: buildAuthHeaders(),
    });
  }

  createConvalidacion(dto: ConvalidacionCreateDto): Observable<ConvalidacionListDto> {
    return this.http.post<ConvalidacionListDto>(this.apiUrl, dto, {
      headers: buildAuthHeaders(),
    });
  }

  updateConvalidacion(
    id: number,
    dto: Partial<ConvalidacionCreateDto>,
  ): Observable<ConvalidacionListDto> {
    return this.http.put<ConvalidacionListDto>(`${this.apiUrl}/${id}`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  descargarPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, {
      headers: buildAuthHeaders(),
      responseType: 'blob',
    });
  }
}
