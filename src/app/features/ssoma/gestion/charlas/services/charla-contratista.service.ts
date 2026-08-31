import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { buildAuthHeaders } from '../../../salud-ocupacional/services/http-base';
import {
  CharlaContratistaPendienteDto,
  CharlaContratistaUploadRequest,
  CharlaContratistaDto,
  RechazarCharlaContratistaDto,
  CharlaContratistaRevisionResult,
} from '../dtos/charla-contratista.dtos';

@Injectable({ providedIn: 'root' })
export class CharlaContratistaService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma-charlas/contratista`;

  constructor(private http: HttpClient) {}

  getPendientes(fecha?: string): Observable<CharlaContratistaPendienteDto[]> {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);
    return this.http.get<CharlaContratistaPendienteDto[]>(`${this.base}/pendientes`, {
      params,
      headers: buildAuthHeaders(),
    });
  }

  getDiasFaltantes(): Observable<CharlaContratistaPendienteDto[]> {
    return this.http.get<CharlaContratistaPendienteDto[]>(`${this.base}/dias-faltantes`, {
      headers: buildAuthHeaders(),
    });
  }

  getHistorial(page = 1, pageSize = 20): Observable<CharlaContratistaDto[]> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<CharlaContratistaDto[]>(`${this.base}/historial`, {
      params,
      headers: buildAuthHeaders(),
    });
  }

  subir(req: CharlaContratistaUploadRequest): Observable<CharlaContratistaDto> {
    return this.http.post<CharlaContratistaDto>(this.base, req, { headers: buildAuthHeaders() });
  }

  // ── Revisión SSOMA / Prevencionista ──────────────────────────────────────
  getRevision(
    estado?: string,
    proyectoId?: number,
    page = 1,
    pageSize = 20,
  ): Observable<CharlaContratistaRevisionResult> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (estado) params = params.set('estado', estado);
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http.get<CharlaContratistaRevisionResult>(`${this.base}/revision`, {
      params,
      headers: buildAuthHeaders(),
    });
  }

  aprobar(id: number): Observable<CharlaContratistaDto> {
    return this.http.put<CharlaContratistaDto>(`${this.base}/${id}/aprobar`, {}, {
      headers: buildAuthHeaders(),
    });
  }

  rechazar(id: number, motivo: string): Observable<CharlaContratistaDto> {
    const dto: RechazarCharlaContratistaDto = { motivo };
    return this.http.put<CharlaContratistaDto>(`${this.base}/${id}/rechazar`, dto, {
      headers: buildAuthHeaders(),
    });
  }
}
