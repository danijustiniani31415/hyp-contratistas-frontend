import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import {
  TopicoAtencionDto,
  TopicoFiltrosDto,
  TopicoTipoAtencionDto,
  CrearTopicoAtencionDto,
  ActualizarTopicoAtencionDto,
  TopicoEvolucionDto,
  TopicoEvolucionCreateDto,
} from './topico.dtos';

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
export class TopicoService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/topico`;

  constructor(private http: HttpClient) {}

  getList(
    filtros: TopicoFiltrosDto = {},
  ): Observable<PagedResponseDTO<TopicoAtencionDto>> {
    return this.http.get<PagedResponseDTO<TopicoAtencionDto>>(this.base, {
      params: toParams(filtros as Record<string, unknown>),
      headers: authHeaders(),
    });
  }

  getHoy(): Observable<TopicoAtencionDto[]> {
    return this.http.get<TopicoAtencionDto[]>(`${this.base}/hoy`, {
      headers: authHeaders(),
    });
  }

  getTiposAtencion(): Observable<TopicoTipoAtencionDto[]> {
    return this.http.get<TopicoTipoAtencionDto[]>(`${this.base}/tipos-atencion`, {
      headers: authHeaders(),
    });
  }

  getById(id: number): Observable<TopicoAtencionDto> {
    return this.http.get<TopicoAtencionDto>(`${this.base}/${id}`, {
      headers: authHeaders(),
    });
  }

  create(dto: CrearTopicoAtencionDto, archivoInforme?: File | null): Observable<{ id: number; message: string }> {
    const fd = new FormData();
    fd.append('workerId', dto.workerId.toString());
    fd.append('fecha', dto.fecha);
    fd.append('tipoAtencionId', dto.tipoAtencionId.toString());
    fd.append('derivadoClinica', dto.derivadoClinica.toString());
    fd.append('generaDescanso', dto.generaDescanso.toString());
    fd.append('generaAccidente', dto.generaAccidente.toString());

    if (dto.hora)              fd.append('hora', dto.hora);
    if (dto.motivo)            fd.append('motivo', dto.motivo);
    if (dto.diagnostico)       fd.append('diagnostico', dto.diagnostico);
    if (dto.diagnosticoCie10)  fd.append('diagnosticoCie10', dto.diagnosticoCie10);
    if (dto.tratamiento)       fd.append('tratamiento', dto.tratamiento);
    if (dto.medicamentos)      fd.append('medicamentos', dto.medicamentos);
    if (dto.presionArterial)   fd.append('presionArterial', dto.presionArterial);
    if (dto.temperatura != null) fd.append('temperatura', dto.temperatura.toString());
    if (dto.frecuenciaCardiaca != null) fd.append('frecuenciaCardiaca', dto.frecuenciaCardiaca.toString());
    if (dto.saturacionOxigeno != null)  fd.append('saturacionOxigeno', dto.saturacionOxigeno.toString());
    if (dto.peso != null)       fd.append('peso', dto.peso.toString());
    if (dto.clinicaDerivacion)  fd.append('clinicaDerivacion', dto.clinicaDerivacion);
    if (dto.descansoDias != null) fd.append('descansoDias', dto.descansoDias.toString());
    if (dto.proyectoId != null) fd.append('proyectoId', dto.proyectoId.toString());
    if (dto.empresaId != null)  fd.append('empresaId', dto.empresaId.toString());
    if (dto.observaciones)           fd.append('observaciones', dto.observaciones);
    if (dto.sctrActivado != null)    fd.append('sctrActivado', dto.sctrActivado.toString());
    if (dto.tipoCasoSctr)            fd.append('tipoCasoSctr', dto.tipoCasoSctr);
    if (archivoInforme)              fd.append('archivoInforme', archivoInforme, archivoInforme.name);

    return this.http.post<{ id: number; message: string }>(this.base, fd, {
      headers: authHeaders(),
    });
  }

  update(
    id: number,
    dto: ActualizarTopicoAtencionDto,
    archivoInforme?: File | null,
  ): Observable<{ id: number; message: string }> {
    const fd = new FormData();
    const entries = Object.entries(dto) as [string, unknown][];
    for (const [k, v] of entries) {
      if (v !== null && v !== undefined) fd.append(k, String(v));
    }
    if (archivoInforme) fd.append('archivoInforme', archivoInforme, archivoInforme.name);

    return this.http.put<{ id: number; message: string }>(`${this.base}/${id}`, fd, {
      headers: authHeaders(),
    });
  }

  cerrar(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/cerrar`, {}, {
      headers: authHeaders(),
    });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, {
      headers: authHeaders(),
    });
  }

  // ── Evoluciones clínicas ────────────────────────────────────────────────────

  getEvoluciones(topicoId: number): Observable<TopicoEvolucionDto[]> {
    return this.http.get<TopicoEvolucionDto[]>(`${this.base}/${topicoId}/evoluciones`, {
      headers: authHeaders(),
    });
  }

  createEvolucion(
    topicoId: number,
    dto: TopicoEvolucionCreateDto,
    archivoEvidencia?: File | null,
  ): Observable<{ id: number; message: string }> {
    const fd = new FormData();
    fd.append('notaEvolucion', dto.notaEvolucion);
    if (archivoEvidencia) fd.append('archivoEvidencia', archivoEvidencia, archivoEvidencia.name);
    return this.http.post<{ id: number; message: string }>(
      `${this.base}/${topicoId}/evoluciones`,
      fd,
      { headers: authHeaders() },
    );
  }

  deleteEvolucion(evId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/evoluciones/${evId}`, {
      headers: authHeaders(),
    });
  }
}
