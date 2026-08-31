import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { SolicitudSalidaFormDataDto } from '../dtos/solicitud-salida-form-data.dto';
import { SolicitudSalidaCreateDto } from '../dtos/solicitud-salida-create.dto';
import { SolicitudSalidaListItemDto } from '../dtos/solicitud-salida-list-item.dto';
import { SolicitudSalidaFilterDataDto } from '../dtos/solicitud-salida-filter-data.dto';
import {
  SolicitudSalidaCapturaDto,
  SolicitudSalidaDetalleDto,
} from '../dtos/solicitud-salida-detalle.dto';
import {
  ConsolidadoS10Ambito,
  ConsolidadoS10Dto,
} from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';

@Injectable({ providedIn: 'root' })
export class SolicitudSalidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/solicitud-salidas`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getMySolicitudes(
    lugarProyectoId: number | null = null,
    estadoAprobacion: string | null = null,
    estadoRendicion: string | null = null,
  ): Observable<SolicitudSalidaListItemDto[]> {
    let params = new HttpParams();
    if (lugarProyectoId != null) params = params.set('lugarProyectoId', lugarProyectoId);
    if (estadoAprobacion)        params = params.set('estadoAprobacion', estadoAprobacion);
    if (estadoRendicion)         params = params.set('estadoRendicion', estadoRendicion);
    return this.http.get<SolicitudSalidaListItemDto[]>(this.apiUrl, { headers: this.headers, params });
  }

  getFilterData(): Observable<SolicitudSalidaFilterDataDto> {
    return this.http.get<SolicitudSalidaFilterDataDto>(`${this.apiUrl}/filter-data`, {
      headers: this.headers,
    });
  }

  getFormData(): Observable<SolicitudSalidaFormDataDto> {
    return this.http.get<SolicitudSalidaFormDataDto>(`${this.apiUrl}/form-data`, {
      headers: this.headers,
    });
  }

  /**
   * Crea la solicitud (multipart): `data` = JSON del dto; `adjuntos` +
   * `adjuntosTrayectoIndex` = documento adjunto por índice de trayecto (0-based),
   * obligatorio cuando el motivo elegido requiere documento.
   */
  create(
    dto: SolicitudSalidaCreateDto,
    adjuntos: { trayectoIndex: number; file: File }[] = [],
  ): Observable<{ id: number; message: string }> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(dto));
    adjuntos.forEach((a) => {
      formData.append('adjuntos', a.file, a.file.name);
      formData.append('adjuntosTrayectoIndex', a.trayectoIndex.toString());
    });
    return this.http.post<{ id: number; message: string }>(this.apiUrl, formData, {
      headers: this.headers,
    });
  }

  getDetalle(id: number): Observable<SolicitudSalidaDetalleDto> {
    return this.http.get<SolicitudSalidaDetalleDto>(`${this.apiUrl}/${id}/detalle`, {
      headers: this.headers,
    });
  }

  /**
   * Avisa al jefe/revisor que el Consolidado del S10 ya está adjunto y su reembolso espera
   * revisión. Lo dispara el trabajador; el correo lleva el botón que abre la solicitud exacta.
   */
  notificarRevisor(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/notificar-revisor`, {}, {
      headers: this.headers,
    });
  }

  /** Cancela una solicitud propia que esté Pendiente (registrada por error o salida no realizada). */
  cancelar(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}/cancelar`, {}, {
      headers: this.headers,
    });
  }

  /**
   * El trabajador rinde sus propias solicitudes seleccionadas Y descarga la planilla de gasto
   * por movilidad. El backend responde con un PDF; el conteo viene en el header X-Rendidas-Count.
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
   * Rinde de una vez TODAS las solicitudes propias del mes anterior que estén listas (aprobadas,
   * no rendidas y con las capturas de todos sus trayectos) y descarga la planilla. El conteo real
   * viene en el header X-Rendidas-Count.
   */
  rendirMesAnterior(): Observable<HttpResponse<Blob>> {
    return this.http.patch(
      `${this.apiUrl}/rendir-mes-anterior`,
      {},
      {
        headers: this.headers,
        responseType: 'blob',
        observe: 'response',
      },
    );
  }

  /**
   * Adjunta (o reemplaza) el PDF Consolidado del S10 de una salida propia ya rendida.
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

  /** Sube capturas asociadas a un trayecto específico. */
  uploadCapturasToTrayecto(
    trayectoId: number,
    items: { file: File; monto: number }[],
  ): Observable<SolicitudSalidaCapturaDto[]> {
    const formData = new FormData();
    items.forEach((it) => {
      formData.append('files', it.file, it.file.name);
      formData.append('montos', it.monto.toString());
    });
    return this.http.post<SolicitudSalidaCapturaDto[]>(
      `${this.apiUrl}/trayectos/${trayectoId}/capturas`,
      formData,
      { headers: this.headers },
    );
  }
}
