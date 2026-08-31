import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders, buildParams } from './http-base';
import {
  EmoCreateDto,
  EmoDetalleDto,
  EmoListItemDto,
  EmoPorTrabajadorDto,
  EmoPorTrabajadorQuery,
  EmoQueryParams,
  WorkerEmoHistorialDto,
} from '../dtos/emo.model';

@Injectable({ providedIn: 'root' })
export class EmoService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/emos`;
  private readonly workersUrl = `${SALUD_OCUPACIONAL_BASE}/workers`;

  constructor(private http: HttpClient) {}

  getEmos(query: EmoQueryParams = {}): Observable<PagedResponseDTO<EmoListItemDto>> {
    return this.http.get<PagedResponseDTO<EmoListItemDto>>(this.apiUrl, {
      params: buildParams(query as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  getEmosPorTrabajador(query: EmoPorTrabajadorQuery = {}): Observable<PagedResponseDTO<EmoPorTrabajadorDto>> {
    return this.http.get<PagedResponseDTO<EmoPorTrabajadorDto>>(`${this.apiUrl}/por-trabajador`, {
      params: buildParams(query as Record<string, unknown>),
      headers: buildAuthHeaders(),
    });
  }

  exportarPorTrabajadorExcel(query: EmoPorTrabajadorQuery = {}): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/por-trabajador/excel`, {
      params: buildParams(query as Record<string, unknown>),
      headers: buildAuthHeaders(),
      responseType: 'blob',
    });
  }

  getEmoDetalle(id: number): Observable<EmoDetalleDto> {
    return this.http.get<EmoDetalleDto>(`${this.apiUrl}/${id}`, {
      headers: buildAuthHeaders(),
    });
  }

  getHistorialWorker(workerId: number): Observable<WorkerEmoHistorialDto> {
    return this.http.get<WorkerEmoHistorialDto>(`${this.workersUrl}/${workerId}/historial-emo`, {
      headers: buildAuthHeaders(),
    });
  }

  createEmo(
    dto: EmoCreateDto,
    archivoLectura?: File | null,
  ): Observable<{ id: number; message: string; interconsultaId?: number }> {
    const fd = new FormData();

    fd.append('workerId', dto.workerId.toString());
    fd.append('tipoEmoId', dto.tipoEmoId.toString());
    if (dto.empresaOrigenId != null) fd.append('empresaOrigenId', dto.empresaOrigenId.toString());
    fd.append('fechaEmo', dto.fechaEmo);
    fd.append('aptitud', dto.aptitud);
    fd.append('requiereInterconsulta', dto.requiereInterconsulta.toString());
    if (dto.clinicaId != null)    fd.append('clinicaId', dto.clinicaId.toString());
    if (dto.medicoId != null)     fd.append('medicoId', dto.medicoId.toString());
    if (dto.numeroInforme)        fd.append('numeroInforme', dto.numeroInforme);
    if (dto.urlResultado)         fd.append('urlResultado', dto.urlResultado);
    if (dto.notas)                fd.append('notas', dto.notas);
    if (dto.fechaLectura)         fd.append('fechaLectura', dto.fechaLectura);
    if (dto.examenes?.length)     fd.append('examenes', JSON.stringify(dto.examenes));
    if (dto.restricciones?.length) fd.append('restricciones', JSON.stringify(dto.restricciones));
    if (dto.interconsultaInline)  fd.append('interconsultaInlineJson', JSON.stringify(dto.interconsultaInline));
    if (archivoLectura)           fd.append('archivoLectura', archivoLectura, archivoLectura.name);

    return this.http.post<{ id: number; message: string; interconsultaId?: number }>(
      this.apiUrl, fd, { headers: buildAuthHeaders() },
    );
  }

  updateEmo(id: number, dto: Partial<EmoCreateDto>): Observable<EmoDetalleDto> {
    return this.http.put<EmoDetalleDto>(`${this.apiUrl}/${id}`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  patchEstadoEmo(id: number, estado: string): Observable<EmoDetalleDto> {
    return this.http.patch<EmoDetalleDto>(
      `${this.apiUrl}/${id}/estado`,
      { estado },
      { headers: buildAuthHeaders() },
    );
  }

  subirDocumentoEmo(emoId: number, file: File, tipo: 'Aptitud' | 'EMO' | 'Lectura'): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('tipo', tipo);
    return this.http.post<{ url: string }>(`${this.apiUrl}/${emoId}/documentos`, fd, {
      headers: buildAuthHeaders(),
    });
  }

  /** Completa la lectura de un EMO "Pendiente de lectura" (médico de Abril): sube el adjunto,
   *  guarda la fecha y aprueba, siguiendo el mismo proceso que cuando lo sube la clínica. */
  completarLecturaAbril(emoId: number, archivo: File, fechaLectura: string): Observable<{ url: string; message: string }> {
    const fd = new FormData();
    fd.append('archivo', archivo, archivo.name);
    fd.append('fechaLectura', fechaLectura);
    return this.http.post<{ url: string; message: string }>(`${this.apiUrl}/${emoId}/lectura-abril`, fd, {
      headers: buildAuthHeaders(),
    });
  }
}
