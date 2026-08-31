import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from './http-base';
import {
  DocumentTypeDto,
  EmailCorporativoValidacionDto,
  WorkerCategoryDto,
  WorkerDatosBasicosDto,
  WorkerUpsertDto,
} from '../dtos/emo.model';

@Injectable({ providedIn: 'root' })
export class WorkerService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/workers`;

  constructor(private http: HttpClient) {}

  createWorker(dto: WorkerUpsertDto): Observable<unknown> {
    return this.http.post(this.apiUrl, dto, { headers: buildAuthHeaders() });
  }

  updateWorker(id: number, dto: WorkerUpsertDto): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}`, dto, { headers: buildAuthHeaders() });
  }

  /** Catálogo de tipos de documento para el select del modal de edición. */
  getDocumentTypes(): Observable<DocumentTypeDto[]> {
    return this.http.get<DocumentTypeDto[]>(`${this.apiUrl}/document-types`, {
      headers: buildAuthHeaders(),
    });
  }

  /** Catálogo workers_category (categoría normalizada) para el select del modal de edición. */
  getWorkerCategories(): Observable<WorkerCategoryDto[]> {
    return this.http.get<WorkerCategoryDto[]>(`${this.apiUrl}/worker-categories`, {
      headers: buildAuthHeaders(),
    });
  }

  /**
   * Verifica un correo corporativo antes de guardar: formato, existencia en el directorio de
   * Abril (tenant de Microsoft) y que no esté ya asignado a otro trabajador. Resuelve las dos
   * comprobaciones en una sola petición.
   *
   * @param workerId Trabajador que se está editando (se excluye del chequeo de duplicados).
   * @param corporativo Lo envía el alta (Staff/Oficina Central = true) cuando aún no hay
   *   workerId; si se omite, el backend usa la clasificación guardada del trabajador.
   */
  validarEmailCorporativo(
    email: string,
    workerId?: number | null,
    corporativo?: boolean,
  ): Observable<EmailCorporativoValidacionDto> {
    let params = new HttpParams().set('email', email);
    if (workerId != null) params = params.set('workerId', workerId);
    if (corporativo != null) params = params.set('corporativo', corporativo);

    return this.http.get<EmailCorporativoValidacionDto>(`${this.apiUrl}/validar-email-corporativo`, {
      headers: buildAuthHeaders(),
      params,
    });
  }

  /** Edición mínima: nombre, tipo/número de documento y cumpleaños (solo Person). */
  updateDatosBasicos(id: number, dto: WorkerDatosBasicosDto): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}/datos-basicos`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  retirarWorker(id: number): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/${id}/retirar`, {}, { headers: buildAuthHeaders() });
  }
}
