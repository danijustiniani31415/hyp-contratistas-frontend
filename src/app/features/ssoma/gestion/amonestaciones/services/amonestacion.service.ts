import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

function authHeaders(): HttpHeaders {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
}
import { environment } from '../../../../../../environments/environment';
import {
  AmonestacionInitDto,
  AmonestacionCreateRequest,
  AmonestacionCreadaDto,
  AmonestacionListQuery,
  AmonestacionListItemDto,
  AmonestacionPagedResult,
  AmonestacionDetalleDto,
  AmonestacionDashboardDto,
  AmonestacionCerrarRequest,
  AmonestacionEditRequest,
  WorkerPuntajeDto,
} from '../dtos/amonestacion.dtos';

@Injectable({ providedIn: 'root' })
export class AmonestacionService {
  private base = `${environment.apiUrl}api/v1/ssoma-amonestaciones`;

  constructor(private http: HttpClient) {}

  getInit(): Observable<AmonestacionInitDto> {
    return this.http.get<AmonestacionInitDto>(`${this.base}/init`);
  }

  crear(req: AmonestacionCreateRequest): Observable<AmonestacionCreadaDto> {
    return this.http.post<AmonestacionCreadaDto>(this.base, req);
  }

  getLista(q: AmonestacionListQuery): Observable<AmonestacionPagedResult<AmonestacionListItemDto>> {
    let params = new HttpParams();
    if (q.proyectoId)    params = params.set('proyectoId', q.proyectoId);
    if (q.workerId)      params = params.set('workerId', q.workerId);
    if (q.tipoSancionId) params = params.set('tipoSancionId', q.tipoSancionId);
    if (q.fechaDesde)    params = params.set('fechaDesde', q.fechaDesde);
    if (q.fechaHasta)    params = params.set('fechaHasta', q.fechaHasta);
    if (q.workerSearch)  params = params.set('workerSearch', q.workerSearch);
    if (q.empresaNombre) params = params.set('empresaNombre', q.empresaNombre);
    if (q.estado)        params = params.set('estado', q.estado);
    if (q.page)          params = params.set('page', q.page);
    if (q.pageSize)      params = params.set('pageSize', q.pageSize);
    return this.http.get<AmonestacionPagedResult<AmonestacionListItemDto>>(this.base, { params });
  }

  getDashboard(): Observable<AmonestacionDashboardDto> {
    return this.http.get<AmonestacionDashboardDto>(`${this.base}/dashboard`);
  }

  getDetalle(id: number): Observable<AmonestacionDetalleDto> {
    return this.http.get<AmonestacionDetalleDto>(`${this.base}/${id}`);
  }

  getPuntajeWorker(workerId: number): Observable<WorkerPuntajeDto> {
    return this.http.get<WorkerPuntajeDto>(`${this.base}/worker/${workerId}/puntaje`);
  }

  getPdfUrl(id: number): string {
    return `${this.base}/${id}/pdf`;
  }

  getPdfBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, {
      headers: authHeaders(),
      responseType: 'blob',
    });
  }

  confirmar(id: number): Observable<AmonestacionCreadaDto> {
    return this.http.post<AmonestacionCreadaDto>(`${this.base}/${id}/confirmar`, {}, {
      headers: authHeaders(),
    });
  }

  cerrar(id: number, req: AmonestacionCerrarRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/cerrar`, req, {
      headers: authHeaders(),
    });
  }

  editar(id: number, req: AmonestacionEditRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, req, {
      headers: authHeaders(),
    });
  }
}

// ── Lista negra de trabajadores restringidos (ss_trabajador_restringido) ──

export interface RestringidoListItemDto {
  id: number;
  dni?: string;
  apellidoNombre?: string;
  motivo: string;
  proyectoOrigen?: string;
  restringidoPor?: string;
  fechaRestriccion?: string;
  tipo?: string;
  activo: boolean;
  createdAt?: string;
}

export interface RestringidoCreateRequest {
  workerId?: number;
  dni?: string;
  apellidoNombre?: string;
  motivo: string;
  proyectoOrigen?: string;
  restringidoPor?: string;
  fechaRestriccion?: string;
}

@Injectable({ providedIn: 'root' })
export class RestringidosService {
  private base = `${environment.apiUrl}api/v1/habilitacion/restringidos`;

  constructor(private http: HttpClient) {}

  getLista(soloActivos = true): Observable<RestringidoListItemDto[]> {
    return this.http.get<RestringidoListItemDto[]>(this.base, {
      headers: authHeaders(),
      params: { soloActivos: soloActivos.toString() },
    });
  }

  crear(req: RestringidoCreateRequest): Observable<RestringidoListItemDto> {
    return this.http.post<RestringidoListItemDto>(this.base, req, { headers: authHeaders() });
  }

  desactivar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, { headers: authHeaders() });
  }
}

// ── Servicio Escuelita Abril ───────────────────────────────────────────────

export interface EscuelitaRegistrarRequest {
  workerId: number;
  fecha: string;
  puntosDescontados: number;
  observaciones?: string;
}

export interface EscuelitaItemDto {
  id: number;
  workerNombre: string;
  workerDni: string;
  fecha: string;
  puntosDescontados: number;
  observaciones?: string;
  puntosNetos: number;
  inhabilitado: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class EscuelitaService {
  private base = `${environment.apiUrl}api/v1/ssoma-escuelita`;

  constructor(private http: HttpClient) {}

  registrar(req: EscuelitaRegistrarRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, req, {
      headers: authHeaders(),
    });
  }

  getByWorker(workerId: number): Observable<EscuelitaItemDto[]> {
    return this.http.get<EscuelitaItemDto[]>(`${this.base}/worker/${workerId}`, {
      headers: authHeaders(),
    });
  }

  getPuntos(workerId: number): Observable<{ workerId: number; puntosNetos: number }> {
    return this.http.get<{ workerId: number; puntosNetos: number }>(
      `${this.base}/worker/${workerId}/puntos`,
      { headers: authHeaders() }
    );
  }
}
