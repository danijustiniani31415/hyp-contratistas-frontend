import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  TareoEnrolamientoEstadoDTO,
  TareoEnrolamientoRequestDTO,
  TareoMarcarRequestDTO,
  TareoRegistroDTO,
  TareoMiTareoHoyDTO,
  TareoRegistroListResponseDTO,
  TareoFiltroParams,
  TareoRevisarRequestDTO,
  TareoReporteSemanalDTO,
  TareoTrabajadorEnrolamientoDTO,
  TareoIdentificacionDTO,
  TareoProyectoGeoDTO,
  TareoProyectoGeoUpdateDTO,
} from '../../dtos/arquitectura-comercial/tareo.model';

@Injectable({ providedIn: 'root' })
export class TareoService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/arquitectura-comercial/tareo`;

  constructor(private http: HttpClient) {}

  private authHeaders(extra?: Record<string, string>): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { ...extra };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  getEnrolamientoEstado(): Observable<TareoEnrolamientoEstadoDTO> {
    return this.http.get<TareoEnrolamientoEstadoDTO>(`${this.apiUrl}/enrolamiento/estado`, {
      headers: this.authHeaders(),
    });
  }

  enrolar(body: TareoEnrolamientoRequestDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/enrolamiento`, body, {
      headers: this.authHeaders(),
    });
  }

  /** idempotencyKey debe generarse UNA vez por intento de marcado (crypto.randomUUID()) y
   * reenviarse igual en reintentos de red, para que el backend no duplique el registro. */
  marcar(body: TareoMarcarRequestDTO, idempotencyKey: string): Observable<TareoRegistroDTO> {
    return this.http.post<TareoRegistroDTO>(`${this.apiUrl}/marcar`, body, {
      headers: this.authHeaders({ 'Idempotency-Key': idempotencyKey }),
    });
  }

  /** workerId sale SIEMPRE del resultado de `identificar()` — el login es una cuenta corporativa
   * compartida entre varios trabajadores, nunca identifica a la persona por sí sola. */
  getMiTareoHoy(workerId: number): Observable<TareoMiTareoHoyDTO> {
    const params = new HttpParams().set('workerId', workerId);
    return this.http.get<TareoMiTareoHoyDTO>(`${this.apiUrl}/mi-tareo/hoy`, {
      params,
      headers: this.authHeaders(),
    });
  }

  /** Identificación 1:N: dado el embedding recién calculado sobre el video en vivo, busca entre
   * los enrolados de Arquitectura Comercial quién es. `identificado: false` si no hay match
   * confiable (nunca lanza error — es la respuesta normal cuando aún no se reconoce a nadie). */
  identificar(embedding: number[]): Observable<TareoIdentificacionDTO> {
    return this.http.post<TareoIdentificacionDTO>(`${this.apiUrl}/identificar`, { embedding }, {
      headers: this.authHeaders(),
    });
  }

  /** Lista de los ~40 trabajadores de Arquitectura Comercial con su estado de enrolamiento,
   * para la pantalla de Gestión de permisos del coordinador (rol Gestor AC). */
  getTrabajadoresParaEnrolar(): Observable<TareoTrabajadorEnrolamientoDTO[]> {
    return this.http.get<TareoTrabajadorEnrolamientoDTO[]>(`${this.apiUrl}/enrolamiento/trabajadores`, {
      headers: this.authHeaders(),
    });
  }

  /** Proyectos de Arquitectura Comercial con su geolocalización — para configurar el geofencing
   * de Marcar Tareo directo desde Gestión de Permisos, sin ir a Configuración > Proyectos. */
  getProyectosGeo(): Observable<TareoProyectoGeoDTO[]> {
    return this.http.get<TareoProyectoGeoDTO[]>(`${this.apiUrl}/proyectos-geo`, {
      headers: this.authHeaders(),
    });
  }

  setProyectoGeo(projectId: number, body: TareoProyectoGeoUpdateDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/proyectos-geo/${projectId}`, body, {
      headers: this.authHeaders(),
    });
  }

  /** Descarga el SSO-FO-150 (autorización de datos biométricos) con nombre/DNI del trabajador
   * ya precargados, para imprimir y firmar en físico. */
  descargarAutorizacionPdf(workerId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/autorizacion/${workerId}/pdf`, {
      headers: this.authHeaders(),
      responseType: 'blob',
    });
  }

  /** Sube el escaneo del SSO-FO-150 ya firmado por el trabajador — habilita su enrolamiento. */
  subirAutorizacion(workerId: number, file: File): Observable<{ url: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; message: string }>(
      `${this.apiUrl}/autorizacion/${workerId}/documento`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  /** El coordinador enrola a un trabajador puntual (no autoservicio: el correo corporativo de
   * obra se comparte entre varios trabajadores). */
  enrolarTrabajador(workerId: number, body: TareoEnrolamientoRequestDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/enrolamiento/trabajadores/${workerId}`, body, {
      headers: this.authHeaders(),
    });
  }

  /** Enrolamiento asistido: el trabajador (desde la cuenta corporativa compartida) elige su
   * nombre de esta lista — solo trae a quienes ya tienen el SSO-FO-150 subido — y se toma su
   * propia foto. Autorizado por featureKey, no requiere el rol Gestor AC. */
  getTrabajadoresDisponiblesParaEnrolar(): Observable<TareoTrabajadorEnrolamientoDTO[]> {
    return this.http.get<TareoTrabajadorEnrolamientoDTO[]>(`${this.apiUrl}/enrolamiento/disponibles`, {
      headers: this.authHeaders(),
    });
  }

  enrolarDisponible(workerId: number, body: TareoEnrolamientoRequestDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/enrolamiento/disponibles/${workerId}`, body, {
      headers: this.authHeaders(),
    });
  }

  getRegistros(filtro: TareoFiltroParams): Observable<TareoRegistroListResponseDTO> {
    let params = new HttpParams().set('pagina', filtro.pagina).set('porPagina', filtro.porPagina);
    if (filtro.workerId) params = params.set('workerId', filtro.workerId);
    if (filtro.proyectoId) params = params.set('proyectoId', filtro.proyectoId);
    if (filtro.desde) params = params.set('desde', filtro.desde);
    if (filtro.hasta) params = params.set('hasta', filtro.hasta);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    return this.http.get<TareoRegistroListResponseDTO>(this.apiUrl + '/registros', {
      params,
      headers: this.authHeaders(),
    });
  }

  revisar(id: number, body: TareoRevisarRequestDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/registros/${id}/revisar`, body, {
      headers: this.authHeaders(),
    });
  }

  getReporteSemanal(semanaLunes: string, proyectoId?: number | null): Observable<TareoReporteSemanalDTO[]> {
    let params = new HttpParams().set('semana', semanaLunes);
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    return this.http.get<TareoReporteSemanalDTO[]>(`${this.apiUrl}/reporte-semanal`, {
      params,
      headers: this.authHeaders(),
    });
  }

  /** Igual patrón que RevisionesService.fotoContenidoUrl: token vía query string porque un
   * <img src> no puede mandar el header Authorization. */
  fotoUrlConToken(url: string): string {
    if (!url) return url;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}access_token=${encodeURIComponent(token)}`;
  }
}
