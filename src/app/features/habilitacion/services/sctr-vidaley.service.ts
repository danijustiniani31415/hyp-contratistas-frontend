import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../core/dtos/api/pagedResponse.model';
import {
  SctrVidaLeyCreateDto,
  SctrVidaLeyDto,
  SctrVidaLeyAprobarDto,
  SctrTrabajadorEstadoDto,
} from '../dtos/sctr.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class SctrVidaLeyService {
  private readonly base = `${HABILITACION_BASE}/sctr-vidaley`;

  constructor(private http: HttpClient) {}

  getList(params: Record<string, unknown> = {}): Observable<PagedResponseDTO<SctrVidaLeyDto>> {
    return this.http.get<PagedResponseDTO<SctrVidaLeyDto>>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams(params),
    });
  }

  getById(id: number): Observable<SctrVidaLeyDto> {
    return this.http.get<SctrVidaLeyDto>(`${this.base}/${id}`, {
      headers: buildHabHeaders(),
    });
  }

  create(dto: SctrVidaLeyCreateDto, empresaId?: number): Observable<SctrVidaLeyDto> {
    return this.http.post<SctrVidaLeyDto>(this.base, dto, {
      headers: buildHabHeaders(),
      params: buildHabParams({ empresaId }),
    });
  }

  update(id: number, dto: SctrVidaLeyCreateDto): Observable<SctrVidaLeyDto> {
    return this.http.put<SctrVidaLeyDto>(`${this.base}/${id}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  aprobar(id: number, dto: SctrVidaLeyAprobarDto): Observable<SctrVidaLeyDto> {
    return this.http.patch<SctrVidaLeyDto>(`${this.base}/${id}/aprobar`, dto, {
      headers: buildHabHeaders(),
    });
  }

  getTrabajadoresPorEmpresa(params: {
    empresaId?: number | null;
    proyectoId?: number;
    tipo?: string;
    tipoPoliza?: string;
    estadoSctr?: string;
    estadoVidaLey?: string;
    areaScopeId?: number;
  }): Observable<SctrTrabajadorEstadoDto[]> {
    return this.http.get<SctrTrabajadorEstadoDto[]>(`${this.base}/trabajadores-por-empresa`, {
      headers: buildHabHeaders(),
      params: buildHabParams(params),
    });
  }

  getPorTrabajador(workerId: number): Observable<SctrVidaLeyDto[]> {
    return this.http.get<SctrVidaLeyDto[]>(`${this.base}/por-trabajador/${workerId}`, {
      headers: buildHabHeaders(),
    });
  }

  getProximosVencer(dias: number = 30): Observable<SctrVidaLeyDto[]> {
    return this.http.get<SctrVidaLeyDto[]>(`${this.base}/proximos-vencer`, {
      headers: buildHabHeaders(),
      params: buildHabParams({ dias }),
    });
  }
}
