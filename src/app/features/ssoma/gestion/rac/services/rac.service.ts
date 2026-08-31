import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { buildAuthHeaders } from '../../../salud-ocupacional/services/http-base';
import {
  RacCategoriaDto,
  RacInfraccionDto,
  RacListQuery,
  RacPagedResult,
  RacListItemDto,
  RacDetalleDto,
  RacDashboardDto,
  RacCreateRequest,
  RacCreadoDto,
  RacCerrarRequest,
  RacFotoUploadResult,
  PenalidadListQuery,
  PenalidadListItemDto,
  PenalidadDetalleDto,
  PenalidadDescargaRequest,
  PenalidadResolverRequest,
} from '../dtos/rac.dtos';

export interface RacListFiltrosState {
  filtroEstado: string;
  filtroSeveridad: string;
  filtroTipo: string;
  filtroSoloConPenalidad: boolean;
  filtroProyectoId: number | null;
  filtroEmpresaReportadaId: number | null;
  filtroEmpresaReportanteId: number | null;
  filtroMes: number | null;
  filtroAnio: number | null;
  page: number;
}

@Injectable({ providedIn: 'root' })
export class RacService {
  private base = `${environment.apiUrl}api/v1/ssoma-rac`;
  private basePen = `${environment.apiUrl}api/v1/ssoma-rac-penalidad`;

  // Se mantiene en memoria mientras dura la sesión de la SPA para que, al volver
  // de cerrar/ver un RAC, la lista no pierda los filtros aplicados.
  listFiltrosState: RacListFiltrosState | null = null;

  constructor(private http: HttpClient) {}

  // ── Catálogos ────────────────────────────────────────────────────

  getCategorias(): Observable<RacCategoriaDto[]> {
    return this.http.get<RacCategoriaDto[]>(`${this.base}/categorias`, { headers: buildAuthHeaders() });
  }

  getInfracciones(): Observable<RacInfraccionDto[]> {
    return this.http.get<RacInfraccionDto[]>(`${this.base}/infracciones`, { headers: buildAuthHeaders() });
  }

  getNiveles(projectId: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/proyecto/${projectId}/niveles`, { headers: buildAuthHeaders() });
  }

  // ── RAC ──────────────────────────────────────────────────────────

  getList(q: RacListQuery): Observable<RacPagedResult<RacListItemDto>> {
    const params = this.buildParams(q);
    return this.http.get<RacPagedResult<RacListItemDto>>(`${this.base}`, { params, headers: buildAuthHeaders() });
  }

  getDetalle(id: number): Observable<RacDetalleDto> {
    return this.http.get<RacDetalleDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  getDashboard(): Observable<RacDashboardDto> {
    return this.http.get<RacDashboardDto>(`${this.base}/dashboard`, { headers: buildAuthHeaders() });
  }

  crear(req: RacCreateRequest): Observable<RacCreadoDto> {
    return this.http.post<RacCreadoDto>(`${this.base}`, req, { headers: buildAuthHeaders() });
  }

  cerrar(id: number, req: RacCerrarRequest): Observable<RacDetalleDto> {
    return this.http.patch<RacDetalleDto>(`${this.base}/${id}/cerrar`, req, { headers: buildAuthHeaders() });
  }

  subirFoto(id: number, file: File, tipo: string): Observable<RacFotoUploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tipo', tipo);
    return this.http.post<RacFotoUploadResult>(`${this.base}/${id}/fotos`, fd, { headers: buildAuthHeaders() });
  }

  getReportePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, { responseType: 'blob', headers: buildAuthHeaders() });
  }

  getFoto(racId: number, fotoId: number): Observable<Blob> {
    return this.http.get(`${this.base}/${racId}/fotos/${fotoId}`, { responseType: 'blob', headers: buildAuthHeaders() });
  }

  // ── Penalidades ──────────────────────────────────────────────────

  getPenalidadList(q: PenalidadListQuery): Observable<RacPagedResult<PenalidadListItemDto>> {
    const params = this.buildParams(q);
    return this.http.get<RacPagedResult<PenalidadListItemDto>>(`${this.basePen}`, { params, headers: buildAuthHeaders() });
  }

  getPenalidadDetalle(id: number): Observable<PenalidadDetalleDto> {
    return this.http.get<PenalidadDetalleDto>(`${this.basePen}/${id}`, { headers: buildAuthHeaders() });
  }

  presentarDescargo(id: number, req: PenalidadDescargaRequest): Observable<void> {
    return this.http.post<void>(`${this.basePen}/${id}/descargo`, req, { headers: buildAuthHeaders() });
  }

  resolverPenalidad(id: number, req: PenalidadResolverRequest): Observable<PenalidadDetalleDto> {
    return this.http.patch<PenalidadDetalleDto>(`${this.basePen}/${id}/resolver`, req, { headers: buildAuthHeaders() });
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private buildParams(q: object): HttpParams {
    let params = new HttpParams();
    for (const [key, val] of Object.entries(q)) {
      if (val !== undefined && val !== null) {
        params = params.set(key, String(val));
      }
    }
    return params;
  }
}
