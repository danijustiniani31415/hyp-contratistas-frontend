import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import {
  DescansoMedicoListItemDto,
  DescansoMedicoDetalleDto,
  DescansoMedicoCreateDto,
  DescansoMedicoUpdateDto,
  DescansoAprobarDto,
  DescansoRechazarDto,
  DarAltaDto,
  ReabrirCasoDto,
  CasoDetalleDto,
  CasoCandidatoDto,
  DescansoSeguimientoDto,
  DescansoSeguimientoCreateDto,
  DescansoFilterDto,
  DescansosInicioDto,
  DescansoTipoDto,
  SeguimientoTipoDto,
  Cie10Dto,
} from './descansos.dtos';

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
export class DescansosService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/descansos`;

  constructor(private http: HttpClient) {}

  /**
   * Carga inicial de la pantalla: catálogo de tipos (filtro + formulario) y primera página en
   * una sola petición. Los cambios de filtro/página después usan getList, que solo trae la tabla.
   */
  getInicio(filtros: DescansoFilterDto = {}): Observable<DescansosInicioDto> {
    return this.http.get<DescansosInicioDto>(`${this.base}/inicio`, {
      params: toParams(filtros as Record<string, unknown>),
      headers: authHeaders(),
    });
  }

  /** Catálogo suelto, para abrir el formulario desde una pantalla que no lo trae cargado. */
  getTipos(): Observable<DescansoTipoDto[]> {
    return this.http.get<DescansoTipoDto[]>(`${this.base}/tipos`, { headers: authHeaders() });
  }

  getList(filtros: DescansoFilterDto = {}): Observable<PagedResponseDTO<DescansoMedicoListItemDto>> {
    return this.http.get<PagedResponseDTO<DescansoMedicoListItemDto>>(this.base, {
      params: toParams(filtros as Record<string, unknown>),
      headers: authHeaders(),
    });
  }

  getById(id: number): Observable<DescansoMedicoDetalleDto> {
    return this.http.get<DescansoMedicoDetalleDto>(`${this.base}/${id}`, {
      headers: authHeaders(),
    });
  }

  create(
    dto: DescansoMedicoCreateDto,
    documentos: File[] = [],
  ): Observable<{ id: number; message: string }> {
    const fd = new FormData();
    for (const [k, v] of Object.entries(dto)) {
      if (v !== null && v !== undefined) fd.append(k, String(v));
    }
    for (const doc of documentos) fd.append('documentos', doc, doc.name);
    return this.http.post<{ id: number; message: string }>(this.base, fd, { headers: authHeaders() });
  }

  /**
   * Contenido de un certificado médico. El archivo está en la carpeta de SharePoint configurada
   * (ss_descanso_carpeta) y lo sirve el backend con su token de app, así se ve sin depender de
   * la sesión de Microsoft 365 del navegador.
   */
  getCertificado(adjuntoId: number): Observable<Blob> {
    return this.http.get(`${this.base}/adjuntos/${adjuntoId}`, {
      headers: authHeaders(),
      responseType: 'blob',
    });
  }

  update(id: number, dto: DescansoMedicoUpdateDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, dto, { headers: authHeaders() });
  }

  /** A diferencia de update() (exige estado Pendiente), esto lo puede hacer el médico en
   * cualquier estado — es la vía normal para asignar el diagnóstico al revisar el caso. */
  asignarDiagnosticoCie10(id: number, codigo: string | null): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.base}/${id}/diagnostico-cie10`,
      { codigo },
      { headers: authHeaders() },
    );
  }

  aprobar(id: number, dto: DescansoAprobarDto): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/aprobar`, dto, {
      headers: authHeaders(),
    });
  }

  rechazar(id: number, dto: DescansoRechazarDto): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/${id}/rechazar`, dto, {
      headers: authHeaders(),
    });
  }

  /** Otros casos abiertos del mismo trabajador, para vincular este descanso (que llegó suelto,
   * subido desde Mi Salud) a un caso ya en curso. */
  getCasosCandidatos(descansoId: number): Observable<CasoCandidatoDto[]> {
    return this.http.get<CasoCandidatoDto[]>(`${this.base}/${descansoId}/casos-candidatos`, {
      headers: authHeaders(),
    });
  }

  vincularCaso(descansoId: number, casoDestinoId: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.base}/${descansoId}/vincular-caso`,
      { casoDestinoId },
      { headers: authHeaders() },
    );
  }

  /** Timeline completo del caso: descansos, seguimientos, estado del alta. */
  getCasoDetalle(casoId: number): Observable<CasoDetalleDto> {
    return this.http.get<CasoDetalleDto>(`${this.base}/casos/${casoId}`, { headers: authHeaders() });
  }

  /** Da de alta el CASO (cierra todos sus descansos), no un descanso individual. */
  darAlta(casoId: number, dto: DarAltaDto): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/casos/${casoId}/alta`, dto, {
      headers: authHeaders(),
    });
  }

  reabrirCaso(casoId: number, dto: ReabrirCasoDto): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.base}/casos/${casoId}/reabrir`, dto, {
      headers: authHeaders(),
    });
  }

  getSeguimientos(casoId: number): Observable<DescansoSeguimientoDto[]> {
    return this.http.get<DescansoSeguimientoDto[]>(`${this.base}/casos/${casoId}/seguimientos`, {
      headers: authHeaders(),
    });
  }

  createSeguimiento(
    casoId: number,
    dto: DescansoSeguimientoCreateDto,
  ): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(
      `${this.base}/casos/${casoId}/seguimientos`,
      dto,
      { headers: authHeaders() },
    );
  }

  getSeguimientoTipos(): Observable<SeguimientoTipoDto[]> {
    return this.http.get<SeguimientoTipoDto[]>(`${this.base}/seguimientos/tipos`, {
      headers: authHeaders(),
    });
  }

  /** Búsqueda del catálogo CIE-10 (server-side: tiene miles de códigos). */
  buscarCie10(search: string): Observable<Cie10Dto[]> {
    return this.http.get<Cie10Dto[]>(`${this.base}/cie10`, {
      params: toParams({ search }),
      headers: authHeaders(),
    });
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, { headers: authHeaders() });
  }
}
