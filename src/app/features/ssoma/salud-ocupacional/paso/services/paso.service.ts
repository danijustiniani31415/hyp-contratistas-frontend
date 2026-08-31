import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { buildAuthHeaders, buildParams } from '../../services/http-base';
import {
  PasoDetalleDto,
  PasoListItemDto,
  PagedResultDto,
  PasoSpiDto,
  PasoDashboardDto,
  PasoAlertaDto,
  GanttItemDto,
  PasoCategoriaDto,
  CreatePasoDto,
  InstanciarPasoDto,
  PasoResumenMesDto,
  PasoAuditoriaDto,
  PasoHistoricoAnioDto,
  PasoSaludActividadListItemDto,
  PasoSaludListQuery,
} from '../dtos/paso.dtos';

const BASE = `${environment.apiUrl}api/v1/ssoma-paso`;

@Injectable({ providedIn: 'root' })
export class PasoService {
  constructor(private http: HttpClient) {}

  getAll(params: {
    proyectoId?: number;
    anio?: number;
    estado?: string;
    esPlantilla?: boolean;
    page?: number;
    pageSize?: number;
  } = {}): Observable<PagedResultDto<PasoListItemDto>> {
    return this.http.get<PagedResultDto<PasoListItemDto>>(BASE, {
      params: buildParams(params as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  getById(id: number): Observable<PasoDetalleDto> {
    return this.http.get<PasoDetalleDto>(`${BASE}/${id}`, { headers: buildAuthHeaders() });
  }

  create(dto: CreatePasoDto): Observable<PasoListItemDto> {
    return this.http.post<PasoListItemDto>(BASE, dto, { headers: buildAuthHeaders() });
  }

  update(id: number, dto: Partial<CreatePasoDto>): Observable<PasoListItemDto> {
    return this.http.put<PasoListItemDto>(`${BASE}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  aprobar(id: number): Observable<PasoListItemDto> {
    return this.http.patch<PasoListItemDto>(`${BASE}/${id}/aprobar`, {}, { headers: buildAuthHeaders() });
  }

  instanciar(id: number, dto: InstanciarPasoDto): Observable<PasoListItemDto> {
    return this.http.post<PasoListItemDto>(`${BASE}/${id}/instanciar`, dto, { headers: buildAuthHeaders() });
  }

  getGantt(id: number): Observable<GanttItemDto[]> {
    return this.http.get<GanttItemDto[]>(`${BASE}/${id}/gantt`, { headers: buildAuthHeaders() });
  }

  getSpi(id: number): Observable<PasoSpiDto> {
    return this.http.get<PasoSpiDto>(`${BASE}/${id}/spi`, { headers: buildAuthHeaders() });
  }

  getDashboard(anio?: number): Observable<PasoDashboardDto> {
    const params = anio ? buildParams({ anio } as Record<string, unknown>) : undefined;
    return this.http.get<PasoDashboardDto>(`${BASE}/dashboard`, { params, headers: buildAuthHeaders() });
  }

  getAlertas(): Observable<PasoAlertaDto[]> {
    return this.http.get<PasoAlertaDto[]>(`${BASE}/alertas`, { headers: buildAuthHeaders() });
  }

  getCategorias(): Observable<PasoCategoriaDto[]> {
    return this.http.get<PasoCategoriaDto[]>(`${BASE}/categorias`, { headers: buildAuthHeaders() });
  }

  getAuditoria(actividadId: number): Observable<PasoAuditoriaDto[]> {
    return this.http.get<PasoAuditoriaDto[]>(`${BASE}/actividad/${actividadId}/auditoria`, {
      headers: buildAuthHeaders(),
    });
  }

  getResumenMes(id: number, anio: number, mes: number): Observable<PasoResumenMesDto> {
    return this.http.get<PasoResumenMesDto>(`${BASE}/${id}/resumen-mes`, {
      params: buildParams({ anio, mes } as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  getHistorico(proyectoId: number): Observable<PasoHistoricoAnioDto[]> {
    return this.http.get<PasoHistoricoAnioDto[]>(`${BASE}/proyecto/${proyectoId}/historico`, {
      headers: buildAuthHeaders(),
    });
  }

  getActividadesSalud(query: PasoSaludListQuery = {}): Observable<PagedResultDto<PasoSaludActividadListItemDto>> {
    return this.http.get<PagedResultDto<PasoSaludActividadListItemDto>>(`${BASE}/salud/actividades`, {
      params: buildParams(query as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  exportReporte(id: number, format: 'excel' | 'pdf'): Observable<Blob> {
    return this.http.get(`${BASE}/${id}/reporte`, {
      params: buildParams({ format } as Record<string, unknown>),
      headers: buildAuthHeaders(),
      responseType: 'blob',
    });
  }
}
