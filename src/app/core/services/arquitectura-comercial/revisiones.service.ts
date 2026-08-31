import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  RevisionDTO,
  CreateRevisionBody,
  RevisionObservacionListResponseDTO,
  RevisionFiltrosDTO,
  RevisionObservacionesQueryParams,
  CreateRevisionObservacionBody,
  RevisionObservacionListItemDTO,
  RevisionDashboardDTO,
  RevisionObservacionStatsDTO,
  UpdateRevisionObservacionBody,
} from '../../dtos/arquitectura-comercial/revisiones.model';

@Injectable({ providedIn: 'root' })
export class RevisionesService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/arquitectura-comercial/revisiones`;

  constructor(private http: HttpClient) {}

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  // ── Catálogo de revisiones ──

  getCatalogo(proyectoId: number | null, soloActivas = true): Observable<RevisionDTO[]> {
    let params = new HttpParams().set('soloActivas', String(soloActivas));
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http.get<RevisionDTO[]>(`${this.apiUrl}/catalogo`, { params, headers: this.authHeaders() });
  }

  crearRevision(body: CreateRevisionBody): Observable<RevisionDTO> {
    return this.http.post<RevisionDTO>(`${this.apiUrl}/catalogo`, body, { headers: this.authHeaders() });
  }

  eliminarRevision(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/catalogo/${id}`, { headers: this.authHeaders() });
  }

  // ── Observaciones dentro de una revisión ──

  getObservaciones(query: RevisionObservacionesQueryParams): Observable<RevisionObservacionListResponseDTO> {
    let params = new HttpParams()
      .set('pagina', query.pagina)
      .set('porPagina', query.porPagina);
    if (query.revisionId) params = params.set('revisionId', query.revisionId);
    if (query.proyectoId) params = params.set('proyectoId', query.proyectoId);
    if (query.estado) params = params.set('estado', query.estado);
    if (query.partida) params = params.set('partida', query.partida);
    if (query.desde) params = params.set('desde', query.desde);
    if (query.hasta) params = params.set('hasta', query.hasta);
    if (query.search) params = params.set('search', query.search);

    return this.http.get<RevisionObservacionListResponseDTO>(this.apiUrl, { params, headers: this.authHeaders() });
  }

  getFiltros(): Observable<RevisionFiltrosDTO> {
    return this.http.get<RevisionFiltrosDTO>(`${this.apiUrl}/filtros`, { headers: this.authHeaders() });
  }

  getDashboard(desde?: string | null, hasta?: string | null, proyectoId?: number | null): Observable<RevisionDashboardDTO> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http.get<RevisionDashboardDTO>(`${this.apiUrl}/dashboard`, { params, headers: this.authHeaders() });
  }

  getStats(desde?: string | null, hasta?: string | null, proyectoId?: number | null): Observable<RevisionObservacionStatsDTO> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http.get<RevisionObservacionStatsDTO>(`${this.apiUrl}/stats`, { params, headers: this.authHeaders() });
  }

  crearObservacion(body: CreateRevisionObservacionBody, foto: File | null): Observable<RevisionObservacionListItemDTO> {
    const form = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      if (value !== null && value !== undefined) form.append(key, String(value));
    });
    if (foto) form.append('foto', foto);

    return this.http.post<RevisionObservacionListItemDTO>(this.apiUrl, form, { headers: this.authHeaders() });
  }

  levantarObservacion(
    id: number,
    comentario: string | null,
    foto: File | null,
    levantaPorWorkerId: number | null,
  ): Observable<RevisionObservacionListItemDTO> {
    const form = new FormData();
    if (comentario) form.append('comentario', comentario);
    if (foto) form.append('foto', foto);
    if (levantaPorWorkerId) form.append('levantaPorWorkerId', String(levantaPorWorkerId));

    return this.http.post<RevisionObservacionListItemDTO>(`${this.apiUrl}/${id}/levantar`, form, { headers: this.authHeaders() });
  }

  updateObservacion(id: number, body: UpdateRevisionObservacionBody): Observable<RevisionObservacionListItemDTO> {
    return this.http.put<RevisionObservacionListItemDTO>(`${this.apiUrl}/${id}`, body, { headers: this.authHeaders() });
  }

  agregarFotoObservacion(revisionObservacionId: number, file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/${revisionObservacionId}/fotos`, form, { headers: this.authHeaders() });
  }

  reemplazarFoto(fotoId: number, file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.patch<{ url: string }>(`${this.apiUrl}/fotos/${fotoId}`, form, { headers: this.authHeaders() });
  }

  /** Igual mecanismo que ObservacionesService.fotoContenidoUrl: token por query string porque
   * un <img src> no puede mandar el header Authorization. */
  fotoContenidoUrl(fotoId: number): string {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return `${this.apiUrl}/fotos/${fotoId}/contenido${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
  }
}
