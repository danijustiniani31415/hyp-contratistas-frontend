import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { ProjectSubContractorFormDataDTO } from '../dtos/projectSubContractorFormDataDTO.model';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { ProjectSubContractorDTO } from '../dtos/projectSubContractorDto.model';

@Injectable({
  providedIn: 'root',
})
export class AdjudicacionesService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/projectSubContractor`;

  constructor(private http: HttpClient) {}

  getFormData(): Observable<ProjectSubContractorFormDataDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectSubContractorFormDataDTO>(`${this.apiUrl}/form-data`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getAdjudicacionPagedWithFilters(filters: any): Observable<{ paged: PagedResponseDTO<ProjectSubContractorDTO>; filters: ProjectSubContractorFormDataDTO }> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined && filters[key] !== 0) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get<{ paged: PagedResponseDTO<ProjectSubContractorDTO>; filters: ProjectSubContractorFormDataDTO }>(
      `${this.apiUrl}/paged-with-filters`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  }

  createAdjudicacion(form: FormData): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, form, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getAdjudicacionPaged(filters: any): Observable<PagedResponseDTO<ProjectSubContractorDTO>> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined && filters[key] !== 0) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get<PagedResponseDTO<ProjectSubContractorDTO>>(`${this.apiUrl}/paged`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getNotificationRecipients(projectSubContractorId: number): Observable<{ to: string[]; cc: string[] }> {
    const token = localStorage.getItem('access_token');
    return this.http.get<{ to: string[]; cc: string[] }>(
      `${this.apiUrl}/${projectSubContractorId}/notification-recipients`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  sendNotification(dto: { projectSubContractorId: number; graphAccessToken: string }): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}/send-notification`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  advanceToStep4(projectSubContractorId: number, graphAccessToken: string): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/advance-to-step4`,
      { graphAccessToken },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  updateStatus(projectSubContractorId: number, projectSubContractorStatusId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(`${this.apiUrl}/${projectSubContractorId}/status`, { projectSubContractorStatusId }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  saveDates(projectSubContractorId: number, dto: { signingDate: string; startDate: string; endDate: string; contractNumber: number | null; promissoryNoteNumber: number | null; guaranteeFundPercentage: number | null; guaranteeFundDays: number | null; guaranteeValidityDays: number | null; paymentDays: number | null }): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(`${this.apiUrl}/${projectSubContractorId}/dates`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Actualiza los datos del paso 1 (información de la adjudicación). Solo permitido en pasos 1–4.
   * Va como multipart porque el mismo guardado puede traer cotizaciones / cuadros comparativos nuevos.
   */
  updateInfo(projectSubContractorId: number, form: FormData): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(`${this.apiUrl}/${projectSubContractorId}/info`, form, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  generateDocument(
    projectSubContractorId: number,
    documentType: string,
  ): Observable<{ fileUrl: string; originalFileName: string }> {
    const token = localStorage.getItem('access_token');
    return this.http.post<{ fileUrl: string; originalFileName: string }>(
      `${this.apiUrl}/${projectSubContractorId}/generate/${documentType}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  updateDocumentStatus(
    projectSubContractorId: number,
    documentType: string,
    dto: { statusId: number | null; observation: string | null },
  ): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/documents/${documentType}/status`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  setArrivalOption(projectSubContractorId: number, arrivedWithObservations: boolean): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/arrival-option`,
      { arrivedWithObservations },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  confirmStep5(projectSubContractorId: number, arrivedWithObservations: boolean, arrivalObservation: string | null, graphAccessToken: string): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/confirm-step5`,
      { arrivedWithObservations, arrivalObservation, graphAccessToken },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /** Paso 6 — persiste el estado de los checkboxes de firma. */
  updateStep6Checks(
    projectSubContractorId: number,
    dto: { signedCostos: boolean; signedGerenteInmobiliario: boolean; signedGerenteGeneral: boolean },
  ): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/step6-checks`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /** Paso 5 — Oficina Central envía las observaciones de la llegada a Oficina Técnica. */
  sendStep5ObservationsEmail(
    projectSubContractorId: number,
    dto: { graphAccessToken: string; observation: string },
  ): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/send-step5-observations-email`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /** Paso 5 — Oficina Técnica notifica a Oficina Central el levantamiento de las observaciones. */
  sendStep5LevantamientoEmail(
    projectSubContractorId: number,
    dto: { graphAccessToken: string; message: string | null },
  ): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/send-step5-levantamiento-email`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  sendStep6Notification(projectSubContractorId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/send-step6-notification`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  sendStep8Notification(projectSubContractorId: number, graphAccessToken: string): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/send-step8-notification`,
      { graphAccessToken },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  sendScNotification(projectSubContractorId: number, graphAccessToken: string, file?: File): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    const form = new FormData();
    if (file) form.append('file', file);
    form.append('graphAccessToken', graphAccessToken);
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/send-sc-notification`,
      form,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  generateContractPackage(projectSubContractorId: number): Observable<{
    bytes: ArrayBuffer;
    fileUrl: string;
    originalFileName: string;
  }> {
    const token = localStorage.getItem('access_token');
    return this.http.post(
      `${this.apiUrl}/${projectSubContractorId}/generate-contract-package`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'arraybuffer',
        observe: 'response',
      },
    ).pipe(
      map((response) => ({
        bytes: response.body as ArrayBuffer,
        fileUrl: response.headers.get('X-Package-Url') || '',
        originalFileName: decodeURIComponent(response.headers.get('X-Package-Filename') || 'package.pdf'),
      })),
    );
  }

  sendObservationEmail(
    projectSubContractorId: number,
    documentType: string,
    dto: { graphAccessToken: string; documentLabel: string; observation: string | null },
  ): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/documents/${documentType}/send-observation-email`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  sendAllObservationsEmail(
    projectSubContractorId: number,
    dto: { graphAccessToken: string },
  ): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/send-all-observations-email`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  /** Paso 3 — Oficina Técnica solicita a Costos el V°B° / comentarios de todos los documentos. */
  sendContractReviewEmail(
    projectSubContractorId: number,
    dto: { graphAccessToken: string },
  ): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/send-contract-review-email`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  sendAllLevantamientoEmail(
    projectSubContractorId: number,
    dto: { graphAccessToken: string },
  ): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${projectSubContractorId}/send-all-levantamiento-email`,
      dto,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  uploadDocument(
    projectSubContractorId: number,
    documentType: string,
    file: File,
  ): Observable<{ fileUrl: string; originalFileName: string }> {
    const token = localStorage.getItem('access_token');
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ fileUrl: string; originalFileName: string }>(
      `${this.apiUrl}/${projectSubContractorId}/documents/${documentType}`,
      form,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
}
