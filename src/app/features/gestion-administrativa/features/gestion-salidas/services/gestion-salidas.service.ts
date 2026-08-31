import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  GestionSalidaDetalleDto,
  GestionSalidaFilterDataDto,
  GestionSalidaListItemDto,
  PagedResponseDto,
  ReembolsoBulkResultDto,
} from '../dtos/gestion-salida.dto';
import {
  ConsolidadoS10Ambito,
  ConsolidadoS10Dto,
} from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';

@Injectable({ providedIn: 'root' })
export class GestionSalidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/gestion-salidas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getAll(
    workerId: number | null,
    lugarProyectoId: number | null,
    estadoRendicion: string | null = null,
    estadoAprobacion: string | null = null,
    estadoReembolso: string | null = null,
    page = 1,
    sortBy: string | null = null,
    sortDir: 'asc' | 'desc' | null = null,
    areaScopeIds: number[] | null = null,
    soloHoy = false,
  ): Observable<PagedResponseDto<GestionSalidaListItemDto>> {
    let params = new HttpParams().set('page', page);
    if (workerId != null)        params = params.set('workerId', workerId);
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
    if (estadoRendicion)         params = params.set('estadoRendicion', estadoRendicion);
    if (estadoAprobacion)        params = params.set('estadoAprobacion', estadoAprobacion);
    if (estadoReembolso)         params = params.set('estadoReembolso', estadoReembolso);
    if (sortBy)                  params = params.set('sortBy', sortBy);
    if (sortDir)                 params = params.set('sortDir', sortDir);
    if (areaScopeIds)            for (const id of areaScopeIds) params = params.append('areaScopeIds', id);
    if (soloHoy)                 params = params.set('soloHoy', true);
    return this.http.get<PagedResponseDto<GestionSalidaListItemDto>>(this.apiUrl, { headers: this.headers, params });
  }

  getDetalle(id: number): Observable<GestionSalidaDetalleDto> {
    return this.http.get<GestionSalidaDetalleDto>(`${this.apiUrl}/${id}/detalle`, {
      headers: this.headers,
    });
  }

  getFilterData(): Observable<GestionSalidaFilterDataDto> {
    return this.http.get<GestionSalidaFilterDataDto>(`${this.apiUrl}/filter-data`, {
      headers: this.headers,
    });
  }

  aprobar(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/aprobar`, {}, {
      headers: this.headers,
    });
  }

  /** Registra (o limpia si hora=null) la hora real de salida. Solo para rol USUARIO DE RECEPCIÓN. */
  setHoraSalidaReal(id: number, hora: string | null): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/${id}/hora-salida-real`,
      { horaSalidaReal: hora },
      { headers: this.headers },
    );
  }

  /** Registra (o limpia si hora=null) la hora real de retorno. Solo para rol USUARIO DE RECEPCIÓN. */
  setHoraRetornoReal(id: number, hora: string | null): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.apiUrl}/${id}/hora-retorno-real`,
      { horaRetornoReal: hora },
      { headers: this.headers },
    );
  }

  rechazar(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/rechazar`, {}, {
      headers: this.headers,
    });
  }

  /** El propio trabajador cancela una solicitud SUYA que esté Pendiente. */
  cancelar(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/cancelar`, {}, {
      headers: this.headers,
    });
  }

  /**
   * Marca las solicitudes como rendidas Y descarga la planilla de gasto por movilidad.
   * El backend responde con un .xlsx; el conteo de procesadas viene en el header X-Rendidas-Count.
   */
  marcarRendidasBulk(ids: number[]): Observable<HttpResponse<Blob>> {
    return this.http.patch(
      `${this.apiUrl}/marcar-rendidas`,
      { ids },
      {
        headers: this.headers,
        responseType: 'blob',
        observe: 'response',
      },
    );
  }

  /**
   * Rinde de una vez TODAS las salidas del mes anterior que estén listas (aprobadas, no rendidas y
   * con las capturas de todos sus trayectos) dentro del alcance del usuario, respetando los filtros
   * de trabajador/área/proyecto que se le pasen. El conteo real viene en X-Rendidas-Count.
   */
  rendirMesAnterior(
    workerId: number | null,
    lugarProyectoId: number | null,
    areaScopeIds: number[] | null = null,
  ): Observable<HttpResponse<Blob>> {
    let params = new HttpParams();
    if (workerId != null)        params = params.set('workerId', workerId);
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
    if (areaScopeIds)            for (const id of areaScopeIds) params = params.append('areaScopeIds', id);
    return this.http.patch(`${this.apiUrl}/rendir-mes-anterior`, {}, {
      headers: this.headers,
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }

  /**
   * Adjunta (o reemplaza) el PDF Consolidado del S10 de una salida ya rendida.
   * `ambito` decide si el archivo cubre toda la planilla de rendición o solo esa salida.
   */
  uploadConsolidadoS10(
    solicitudId: number,
    file: File,
    ambito: ConsolidadoS10Ambito,
  ): Observable<ConsolidadoS10Dto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('ambito', ambito);
    return this.http.post<ConsolidadoS10Dto>(
      `${this.apiUrl}/${solicitudId}/consolidado-s10`,
      formData,
      { headers: this.headers },
    );
  }

  // ── Reembolso ────────────────────────────────────────────────────────

  /** Aprueba el reembolso de las salidas indicadas (rendidas y con Consolidado del S10). */
  aprobarReembolso(ids: number[]): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/aprobar`, { ids }, {
      headers: this.headers,
    });
  }

  /** Rechaza el reembolso con una observación (obligatoria: es lo que el trabajador subsana). */
  rechazarReembolso(ids: number[], observacion: string): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(
      `${this.apiUrl}/reembolso/rechazar`,
      { ids, observacion },
      { headers: this.headers },
    );
  }

  /**
   * Firma la planilla de rendición de las salidas con reembolso aprobado. Responde 409 cuando el
   * usuario todavía no registró su firma: la pantalla usa ese código para abrir el modal donde la
   * dibuja y reintentar, en vez de mandarlo a Configuración.
   */
  firmarPlanillas(ids: number[]): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/firmar`, { ids }, {
      headers: this.headers,
    });
  }

  /** Tesorería marca como pagadas las salidas ya firmadas. */
  marcarPagadas(ids: number[]): Observable<ReembolsoBulkResultDto> {
    return this.http.patch<ReembolsoBulkResultDto>(`${this.apiUrl}/reembolso/pagar`, { ids }, {
      headers: this.headers,
    });
  }

  downloadExcel(
    workerId: number | null,
    lugarProyectoId: number | null,
    estadoRendicion: string | null = null,
    estadoAprobacion: string | null = null,
    estadoReembolso: string | null = null,
    areaScopeIds: number[] | null = null,
    soloHoy = false,
  ): Observable<Blob> {
    let params = new HttpParams();
    if (workerId != null)        params = params.set('workerId', workerId);
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
    if (estadoRendicion)         params = params.set('estadoRendicion', estadoRendicion);
    if (estadoAprobacion)        params = params.set('estadoAprobacion', estadoAprobacion);
    if (estadoReembolso)         params = params.set('estadoReembolso', estadoReembolso);
    if (areaScopeIds)            for (const id of areaScopeIds) params = params.append('areaScopeIds', id);
    if (soloHoy)                 params = params.set('soloHoy', true);
    return this.http.get(`${this.apiUrl}/exportar-excel`, {
      headers: this.headers,
      params,
      responseType: 'blob',
    });
  }
}
