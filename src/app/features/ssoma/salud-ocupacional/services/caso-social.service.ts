import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders, buildParams } from './http-base';
import {
  CasoSocialListItemDto,
  CasoSocialDetalleDto,
  CasoSocialCreateDto,
  CasoSocialUpdateDto,
  CasoSocialCerrarDto,
  CasoSocialFilterDto,
  SeguimientoCreateDto,
  SctrGestionDto,
  SctrGestionCreateDto,
  SctrGestionUpdateDto,
} from '../dtos/caso-social.dtos';

@Injectable({ providedIn: 'root' })
export class CasoSocialService {
  private readonly baseUrl = `${SALUD_OCUPACIONAL_BASE}/casos-sociales`;

  constructor(private http: HttpClient) {}

  getList(filter: CasoSocialFilterDto = {}): Observable<PagedResponseDTO<CasoSocialListItemDto>> {
    return this.http.get<PagedResponseDTO<CasoSocialListItemDto>>(this.baseUrl, {
      params: buildParams(filter as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  getById(id: string): Observable<CasoSocialDetalleDto> {
    return this.http.get<CasoSocialDetalleDto>(`${this.baseUrl}/${id}`, {
      headers: buildAuthHeaders(),
    });
  }

  create(dto: CasoSocialCreateDto): Observable<{ id: string; message: string }> {
    return this.http.post<{ id: string; message: string }>(this.baseUrl, dto, {
      headers: buildAuthHeaders(),
    });
  }

  update(id: string, dto: CasoSocialUpdateDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/${id}`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  cerrar(id: string, dto: CasoSocialCerrarDto): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/${id}/cerrar`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`, {
      headers: buildAuthHeaders(),
    });
  }

  createSeguimiento(casoId: string, dto: SeguimientoCreateDto): Observable<{ id: string; message: string }> {
    return this.http.post<{ id: string; message: string }>(
      `${this.baseUrl}/${casoId}/seguimientos`,
      dto,
      { headers: buildAuthHeaders() },
    );
  }

  deleteSeguimiento(seguimientoId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/seguimientos/${seguimientoId}`,
      { headers: buildAuthHeaders() },
    );
  }

  // ── SCTR ────────────────────────────────────────────────────────────────────

  getSctr(casoId: string): Observable<SctrGestionDto | null> {
    return this.http.get<SctrGestionDto | null>(
      `${this.baseUrl}/${casoId}/sctr`,
      { headers: buildAuthHeaders() },
    );
  }

  createSctr(casoId: string, dto: SctrGestionCreateDto): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(
      `${this.baseUrl}/${casoId}/sctr`,
      dto,
      { headers: buildAuthHeaders() },
    );
  }

  updateSctr(casoId: string, dto: SctrGestionUpdateDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.baseUrl}/${casoId}/sctr`,
      dto,
      { headers: buildAuthHeaders() },
    );
  }

  deleteSctr(casoId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/${casoId}/sctr`,
      { headers: buildAuthHeaders() },
    );
  }
}
