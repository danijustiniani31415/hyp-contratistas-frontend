import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import {
  AccidenteTrabajoListItemDto,
  AccidenteFilterDto,
  AccidenteTrabajoDetalleDto,
  AccidenteTrabajoUpdateDto,
  CitaMedicaItemDto,
  CitaMedicaCreateDto,
  EquipoPrestadoItemDto,
  EquipoPrestadoCreateDto,
  EquipoPrestadoDevolverDto,
  AltaMedicaItemDto,
  AltaMedicaCreateDto,
  TiposSeguimientoDto,
} from './accidentes.dtos';

function authHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toParams(obj: Record<string, unknown>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  }
  return p;
}

@Injectable({ providedIn: 'root' })
export class AccidentesService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/accidentes`;

  constructor(private http: HttpClient) {}

  // ── Lista y detalle ──────────────────────────────────────────────

  getList(filtros: AccidenteFilterDto = {}): Observable<PagedResponseDTO<AccidenteTrabajoListItemDto>> {
    return this.http.get<PagedResponseDTO<AccidenteTrabajoListItemDto>>(this.base, {
      params: toParams(filtros as Record<string, unknown>),
      headers: authHeaders(),
    });
  }

  getDetalle(id: number): Observable<AccidenteTrabajoDetalleDto> {
    return this.http.get<AccidenteTrabajoDetalleDto>(`${this.base}/${id}`, {
      headers: authHeaders(),
    });
  }

  updateAccidente(id: number, dto: AccidenteTrabajoUpdateDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto, {
      headers: authHeaders(),
    });
  }

  marcarReinduccion(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/reinduccion`, {}, {
      headers: authHeaders(),
    });
  }

  cerrar(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/cerrar`, {}, {
      headers: authHeaders(),
    });
  }

  // ── Catálogos ────────────────────────────────────────────────────

  getTiposSeguimiento(): Observable<TiposSeguimientoDto> {
    return this.http.get<TiposSeguimientoDto>(`${this.base}/tipos-seguimiento`, {
      headers: authHeaders(),
    });
  }

  // ── Citas médicas ────────────────────────────────────────────────

  getCitas(accidenteId: number): Observable<CitaMedicaItemDto[]> {
    return this.http.get<CitaMedicaItemDto[]>(`${this.base}/${accidenteId}/citas`, {
      headers: authHeaders(),
    });
  }

  createCita(accidenteId: number, dto: CitaMedicaCreateDto): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/${accidenteId}/citas`, dto, {
      headers: authHeaders(),
    });
  }

  updateCita(citaId: number, dto: CitaMedicaCreateDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/citas/${citaId}`, dto, {
      headers: authHeaders(),
    });
  }

  deleteCita(citaId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/citas/${citaId}`, {
      headers: authHeaders(),
    });
  }

  // ── Equipos prestados ────────────────────────────────────────────

  getEquipos(accidenteId: number): Observable<EquipoPrestadoItemDto[]> {
    return this.http.get<EquipoPrestadoItemDto[]>(`${this.base}/${accidenteId}/equipos`, {
      headers: authHeaders(),
    });
  }

  createEquipo(accidenteId: number, dto: EquipoPrestadoCreateDto): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/${accidenteId}/equipos`, dto, {
      headers: authHeaders(),
    });
  }

  devolverEquipo(equipoId: number, dto: EquipoPrestadoDevolverDto): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/equipos/${equipoId}/devolver`, dto, {
      headers: authHeaders(),
    });
  }

  deleteEquipo(equipoId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/equipos/${equipoId}`, {
      headers: authHeaders(),
    });
  }

  // ── Alta médica ──────────────────────────────────────────────────

  getAlta(accidenteId: number): Observable<AltaMedicaItemDto | null> {
    return this.http.get<AltaMedicaItemDto | null>(`${this.base}/${accidenteId}/alta`, {
      headers: authHeaders(),
    });
  }

  createAlta(accidenteId: number, dto: AltaMedicaCreateDto): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.base}/${accidenteId}/alta`, dto, {
      headers: authHeaders(),
    });
  }

  updateAlta(accidenteId: number, dto: AltaMedicaCreateDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${accidenteId}/alta`, dto, {
      headers: authHeaders(),
    });
  }

  deleteAlta(accidenteId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${accidenteId}/alta`, {
      headers: authHeaders(),
    });
  }
}
