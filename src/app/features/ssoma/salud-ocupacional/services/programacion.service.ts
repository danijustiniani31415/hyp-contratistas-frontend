import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { SALUD_OCUPACIONAL_BASE, SSOMA_BASE, buildAuthHeaders, buildParams } from './http-base';
import {
  ProgramacionCreateDto,
  ProgramacionEstadoPatchDto,
  ProgramacionListDto,
  ProgramacionQueryParams,
  ProgramacionResumenDto,
  ProgramacionUpdateDto,
} from '../dtos/programacion.model';
import { ProgramacionHabilitacionDto } from '../dtos/programacion-habilitacion.dto';

@Injectable({ providedIn: 'root' })
export class ProgramacionService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/programaciones`;

  constructor(private http: HttpClient) {}

  getProgramaciones(
    query: ProgramacionQueryParams = {},
  ): Observable<PagedResponseDTO<ProgramacionListDto>> {
    return this.http.get<PagedResponseDTO<ProgramacionListDto>>(this.apiUrl, {
      params: buildParams(query as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  getResumen(
    query: Omit<ProgramacionQueryParams, 'page' | 'pageSize' | 'estado'> = {},
  ): Observable<ProgramacionResumenDto> {
    return this.http.get<ProgramacionResumenDto>(`${this.apiUrl}/resumen`, {
      params: buildParams(query as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  getProgramacion(id: number): Observable<ProgramacionListDto> {
    return this.http.get<ProgramacionListDto>(`${this.apiUrl}/${id}`, {
      headers: buildAuthHeaders(),
    });
  }

  createProgramacion(dto: ProgramacionCreateDto): Observable<ProgramacionListDto> {
    return this.http.post<ProgramacionListDto>(this.apiUrl, dto, {
      headers: buildAuthHeaders(),
    });
  }

  updateProgramacion(
    id: number,
    dto: ProgramacionUpdateDto,
  ): Observable<ProgramacionListDto> {
    return this.http.put<ProgramacionListDto>(`${this.apiUrl}/${id}`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  patchEstado(
    id: number,
    body: ProgramacionEstadoPatchDto,
  ): Observable<ProgramacionListDto> {
    return this.http.patch<ProgramacionListDto>(`${this.apiUrl}/${id}/estado`, body, {
      headers: buildAuthHeaders(),
    });
  }

  accionClinica(id: number, body: Record<string, unknown>): Observable<ProgramacionListDto> {
    return this.http.patch<ProgramacionListDto>(`${this.apiUrl}/${id}/clinica-accion`, body, {
      headers: buildAuthHeaders(),
    });
  }

  getHabilitacion(f: { estado?: string; proyectoId?: number; fecha?: string; soloNoNotificados?: boolean } = {}): Observable<ProgramacionHabilitacionDto[]> {
    const url = `${this.apiUrl}/habilitacion`;
    console.log('[EmosProgramados] GET', url, f);
    return this.http.get<ProgramacionHabilitacionDto[]>(url, {
      params: buildParams(f as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  patchNotificado(id: number, notificado: boolean): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/notificado`, { notificado }, { headers: buildAuthHeaders() });
  }
}
