import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AuditoriaAtsPreguntaDto,
  AuditoriaAtsListItemDto,
  AuditoriaAtsDetalleDto,
  CrearAuditoriaAtsRequest,
  AuditoriaAtsFiltros,
} from './auditoria-ats.dtos';

@Injectable({ providedIn: 'root' })
export class AuditoriaAtsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma-auditoria-ats`;

  getPreguntas(): Observable<AuditoriaAtsPreguntaDto[]> {
    return this.http.get<AuditoriaAtsPreguntaDto[]>(`${this.base}/preguntas`);
  }

  getList(filtros: AuditoriaAtsFiltros): Observable<{
    items: AuditoriaAtsListItemDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let p = new HttpParams();
    if (filtros.auditadoWorkerId) p = p.set('auditadoWorkerId', filtros.auditadoWorkerId);
    if (filtros.auditorWorkerId) p = p.set('auditorWorkerId', filtros.auditorWorkerId);
    if (filtros.proyectoId) p = p.set('proyectoId', filtros.proyectoId);
    if (filtros.fechaDesde) p = p.set('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta) p = p.set('fechaHasta', filtros.fechaHasta);
    if (filtros.estado) p = p.set('estado', filtros.estado);
    p = p.set('page', filtros.page ?? 1);
    p = p.set('pageSize', filtros.pageSize ?? 20);
    return this.http.get<{ items: AuditoriaAtsListItemDto[]; total: number; page: number; pageSize: number }>(
      this.base,
      { params: p },
    );
  }

  getDetalle(id: number): Observable<AuditoriaAtsDetalleDto> {
    return this.http.get<AuditoriaAtsDetalleDto>(`${this.base}/${id}`);
  }

  crear(req: CrearAuditoriaAtsRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, req);
  }
}
