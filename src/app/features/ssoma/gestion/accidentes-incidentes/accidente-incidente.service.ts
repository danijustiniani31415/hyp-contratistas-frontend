import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  FlashReportInicializarDto,
  FlashReportListItemDto,
  FlashReportDetalleDto,
  CrearFlashReportRequest,
  ActualizarFlashReportRequest,
  EntregableDto,
  ActualizarEntregableRequest,
  Rm050Dto,
  GuardarRm050Request,
} from './accidente-incidente.dtos';

@Injectable({ providedIn: 'root' })
export class AccidenteIncidenteService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma-accidentes-incidentes`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  inicializar(): Observable<FlashReportInicializarDto> {
    return this.http.get<FlashReportInicializarDto>(`${this.base}/inicializar`, {
      headers: this.authHeaders(),
    });
  }

  getList(params: {
    proyectoId?: number;
    tipoId?: number;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    soloEnviados?: boolean;
    areaOrigen?: string;
    page?: number;
    pageSize?: number;
  }): Observable<{ items: FlashReportListItemDto[]; total: number; page: number; pageSize: number; totalPages: number }> {
    let p = new HttpParams();
    if (params.proyectoId) p = p.set('proyectoId', params.proyectoId);
    if (params.tipoId) p = p.set('tipoId', params.tipoId);
    if (params.estado) p = p.set('estado', params.estado);
    if (params.fechaDesde) p = p.set('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) p = p.set('fechaHasta', params.fechaHasta);
    if (params.soloEnviados != null) p = p.set('soloEnviados', params.soloEnviados);
    if (params.areaOrigen) p = p.set('areaOrigen', params.areaOrigen);
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 20);
    return this.http.get<any>(this.base, { headers: this.authHeaders(), params: p });
  }

  getDetalle(id: number): Observable<FlashReportDetalleDto> {
    return this.http.get<FlashReportDetalleDto>(`${this.base}/${id}`, { headers: this.authHeaders() });
  }

  crear(request: CrearFlashReportRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, request, { headers: this.authHeaders() });
  }

  actualizar(id: number, request: ActualizarFlashReportRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, request, { headers: this.authHeaders() });
  }

  actualizarSeveridad(
    id: number,
    consecuenciaRealPersonal: number | undefined,
    consecuenciaPotencialPersonal: number | undefined,
  ): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.base}/${id}/severidad`,
      { consecuenciaRealPersonal: consecuenciaRealPersonal ?? null, consecuenciaPotencialPersonal: consecuenciaPotencialPersonal ?? null },
      { headers: this.authHeaders() },
    );
  }

  enviar(id: number, enviarEmail: boolean = true): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.base}/${id}/enviar?enviarEmail=${enviarEmail}`,
      {},
      { headers: this.authHeaders() },
    );
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, { headers: this.authHeaders() });
  }

  getEntregables(accidenteId: number): Observable<EntregableDto[]> {
    return this.http.get<EntregableDto[]>(`${this.base}/${accidenteId}/entregables`, { headers: this.authHeaders() });
  }

  actualizarEntregable(entregableId: number, req: ActualizarEntregableRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/entregables/${entregableId}`, req, { headers: this.authHeaders() });
  }

  subirArchivoEntregable(entregableId: number, archivo: File): Observable<{ url: string; message: string }> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<{ url: string; message: string }>(`${this.base}/entregables/${entregableId}/archivo`, form, { headers: new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` }) });
  }

  eliminarArchivoEntregable(archivoId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/entregables/archivo/${archivoId}`, { headers: this.authHeaders() });
  }

  getRm050(accidenteId: number): Observable<Rm050Dto> {
    return this.http.get<Rm050Dto>(`${this.base}/${accidenteId}/rm050`, { headers: this.authHeaders() });
  }

  guardarRm050(accidenteId: number, req: GuardarRm050Request): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${accidenteId}/rm050`, req, { headers: this.authHeaders() });
  }

  getPdfUrl(id: number): string {
    return `${this.base}/${id}/pdf`;
  }

  getFotoUrl(id: number, slot: 1 | 2): string {
    return `${this.base}/${id}/foto/${slot}`;
  }

  getMedidas(accidenteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${accidenteId}/medidas`, { headers: this.authHeaders() });
  }

  addMedida(accidenteId: number, req: any): Observable<{ id: number; message: string }> {
    return this.http.post<any>(`${this.base}/${accidenteId}/medidas`, req, { headers: this.authHeaders() });
  }

  updateMedida(accionId: number, req: any): Observable<{ message: string }> {
    return this.http.patch<any>(`${this.base}/medidas/${accionId}`, req, { headers: this.authHeaders() });
  }

  deleteMedida(accionId: number): Observable<{ message: string }> {
    return this.http.delete<any>(`${this.base}/medidas/${accionId}`, { headers: this.authHeaders() });
  }

  descargarPdfBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, {
      headers: this.authHeaders(),
      responseType: 'blob',
    });
  }

  getAccionesVencidas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/acciones-correctivas/vencidas`, { headers: this.authHeaders() });
  }

  crearLeccionDesdeAccion(accionId: number, req: { proyectoId: number; areaId: number; impactDescription?: string }): Observable<{ message: string; lessonId: number }> {
    return this.http.post<any>(`${this.base}/acciones-correctivas/${accionId}/leccion`, req, { headers: this.authHeaders() });
  }

  getMintraUrl(id: number): string {
    return `${this.base}/${id}/mintra`;
  }

  reclasificar(id: number): Observable<{ message: string; accidenteTrabajoId?: number }> {
    return this.http.post<{ message: string; accidenteTrabajoId?: number }>(
      `${this.base}/${id}/reclasificar`, {}, { headers: this.authHeaders() });
  }
}
