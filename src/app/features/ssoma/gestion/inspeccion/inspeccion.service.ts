import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  InspeccionDashboardDto,
  InspeccionDetalleDto,
  InspeccionListItemDto,
  InspeccionTipoDto,
  InspeccionChecklistItemDto,
  CrearInspeccionRequest,
  CerrarHallazgoRequest,
  EditarHallazgoRequest,
  InspeccionHallazgoRequest,
  InspeccionAbiertaListItemDto,
  InspeccionDestinatariosCierreDto,
} from './inspeccion.dtos';

@Injectable({ providedIn: 'root' })
export class InspeccionService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma-inspeccion`;

  getCatalogos(): Observable<{ tipos: InspeccionTipoDto[] }> {
    return this.http.get<{ tipos: InspeccionTipoDto[] }>(`${this.base}/catalogos`);
  }

  getChecklist(tipoId: number): Observable<InspeccionChecklistItemDto[]> {
    return this.http.get<InspeccionChecklistItemDto[]>(`${this.base}/checklist/${tipoId}`);
  }

  getList(params: {
    proyectoId?: number;
    tipoId?: number;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    pageSize?: number;
  }): Observable<{ items: InspeccionListItemDto[]; total: number; page: number; pageSize: number }> {
    let p = new HttpParams();
    if (params.proyectoId) p = p.set('proyectoId', params.proyectoId);
    if (params.tipoId) p = p.set('tipoId', params.tipoId);
    if (params.estado) p = p.set('estado', params.estado);
    if (params.fechaDesde) p = p.set('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) p = p.set('fechaHasta', params.fechaHasta);
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 20);
    return this.http.get<{ items: InspeccionListItemDto[]; total: number; page: number; pageSize: number }>(
      this.base,
      { params: p },
    );
  }

  getDashboard(proyectoId?: number, anio?: number): Observable<InspeccionDashboardDto> {
    let p = new HttpParams();
    if (proyectoId) p = p.set('proyectoId', proyectoId);
    if (anio) p = p.set('anio', anio);
    return this.http.get<InspeccionDashboardDto>(`${this.base}/dashboard`, { params: p });
  }

  getDetalle(id: number): Observable<InspeccionDetalleDto> {
    return this.http.get<InspeccionDetalleDto>(`${this.base}/${id}`);
  }

  crear(request: CrearInspeccionRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, request);
  }

  cerrarHallazgo(id: number, request: CerrarHallazgoRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiUrl}api/v1/ssoma-inspeccion-hallazgo/${id}/cerrar`,
      request,
    );
  }

  editarHallazgo(id: number, request: EditarHallazgoRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${environment.apiUrl}api/v1/ssoma-inspeccion-hallazgo/${id}`,
      request,
    );
  }

  eliminarHallazgo(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrl}api/v1/ssoma-inspeccion-hallazgo/${id}`,
    );
  }

  descargarPdf(id: number): Observable<Blob> {
    const token =
      typeof localStorage !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';
    return this.http.get(`${this.base}/${id}/pdf`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getAbiertas(proyectoId?: number): Observable<InspeccionAbiertaListItemDto[]> {
    let p = new HttpParams();
    if (proyectoId) p = p.set('proyectoId', proyectoId);
    return this.http.get<InspeccionAbiertaListItemDto[]>(`${this.base}/abiertas`, { params: p });
  }

  unirse(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/unirse`, {});
  }

  agregarHallazgo(id: number, request: InspeccionHallazgoRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/hallazgos`, request);
  }

  cerrarColaborativa(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/cerrar-colaborativa`, {});
  }

  getDestinatariosCierreColaborativa(id: number): Observable<InspeccionDestinatariosCierreDto> {
    return this.http.get<InspeccionDestinatariosCierreDto>(`${this.base}/${id}/destinatarios-cierre-colaborativa`);
  }

  reabrirColaborativa(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/reabrir-colaborativa`, {});
  }

  descargarFoto(path: string, tipo: 'fotos' | 'firmas' = 'fotos'): Observable<Blob> {
    const token =
      typeof localStorage !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';
    let p = new HttpParams().set('path', path).set('tipo', tipo);
    return this.http.get(`${this.base}/media`, {
      params: p,
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
