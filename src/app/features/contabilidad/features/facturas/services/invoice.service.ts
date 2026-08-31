import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import {
  InvoiceInitDto,
  InvoiceFilterDto,
  InvoiceSupplierCreateDto,
  InvoiceSupplierDto,
  PagedResponseDTO,
  InvoiceDto,
  InvoiceDetailDto,
  InvoiceDashboardDto,
  InvoiceDashboardInitDto,
  InvoiceBlockGroupDto,
  SunatContributorDTO,
} from '../dtos/invoice.dtos';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/invoice`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  private buildParams(filter: InvoiceFilterDto): HttpParams {
    let params = new HttpParams().set('page', filter.page.toString());
    if (filter.search) params = params.set('search', filter.search);
    if (filter.serie) params = params.set('serie', filter.serie);
    if (filter.correlativo) params = params.set('correlativo', filter.correlativo);
    if (filter.contributorId) params = params.set('contributorId', filter.contributorId.toString());
    if (filter.contributorRuc) params = params.set('contributorRuc', filter.contributorRuc);
    if (filter.abrilContributorId) params = params.set('abrilContributorId', filter.abrilContributorId.toString());
    if (filter.abrilContributorRuc) params = params.set('abrilContributorRuc', filter.abrilContributorRuc);
    if (filter.invoicePaymentFormId) params = params.set('invoicePaymentFormId', filter.invoicePaymentFormId.toString());
    if (filter.currencyId) params = params.set('currencyId', filter.currencyId.toString());
    if (filter.totalMin != null) params = params.set('totalMin', filter.totalMin.toString());
    if (filter.totalMax != null) params = params.set('totalMax', filter.totalMax.toString());
    if (filter.issueDateFrom) params = params.set('issueDateFrom', filter.issueDateFrom);
    if (filter.issueDateTo) params = params.set('issueDateTo', filter.issueDateTo);
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortDir) params = params.set('sortDir', filter.sortDir);
    return params;
  }

  /** Carga inicial: desplegables + primera página de la tabla en una sola petición. */
  getInit(filter: InvoiceFilterDto): Observable<InvoiceInitDto> {
    return this.http.get<InvoiceInitDto>(`${this.apiUrl}/init`, {
      headers: this.headers,
      params: this.buildParams(filter),
    });
  }

  /** Solo la tabla filtrada (sin volver a traer los datos de los desplegables). */
  getPaged(filter: InvoiceFilterDto): Observable<PagedResponseDTO<InvoiceDto>> {
    return this.http.get<PagedResponseDTO<InvoiceDto>>(`${this.apiUrl}/paged`, {
      headers: this.headers,
      params: this.buildParams(filter),
    });
  }

  getDashboardInit(filter: InvoiceFilterDto): Observable<InvoiceDashboardInitDto> {
    return this.http.get<InvoiceDashboardInitDto>(`${this.apiUrl}/dashboard/init`, {
      headers: this.headers,
      params: this.buildParams(filter),
    });
  }

  getDashboard(filter: InvoiceFilterDto): Observable<InvoiceDashboardDto> {
    return this.http.get<InvoiceDashboardDto>(`${this.apiUrl}/dashboard`, {
      headers: this.headers,
      params: this.buildParams(filter),
    });
  }

  getBlocks(filter: InvoiceFilterDto): Observable<InvoiceBlockGroupDto[]> {
    return this.http.get<InvoiceBlockGroupDto[]>(`${this.apiUrl}/blocks`, {
      headers: this.headers,
      params: this.buildParams(filter),
    });
  }

  getDetail(invoiceId: number): Observable<InvoiceDetailDto> {
    return this.http.get<InvoiceDetailDto>(`${this.apiUrl}/${invoiceId}`, { headers: this.headers });
  }

  create(formData: FormData): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, formData, { headers: this.headers });
  }

  update(formData: FormData): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, formData, { headers: this.headers });
  }

  /** Importación masiva desde el Excel de órdenes de pago + archivos. */
  import(formData: FormData): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}/import`, formData, { headers: this.headers });
  }

  /** Adjunta/actualiza el documento de una factura existente. */
  uploadDocument(invoiceId: number, formData: FormData): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}/${invoiceId}/document`, formData, { headers: this.headers });
  }

  getByRuc(ruc: string): Observable<SunatContributorDTO> {
    return this.http.get<SunatContributorDTO>(`${this.apiUrl}/ruc/${ruc}`, { headers: this.headers });
  }

  /** Genera el documento firmado (PDF con la firma) de una factura y devuelve su URL. */
  sign(invoiceId: number): Observable<{ message: string; signedDocumentUrl: string }> {
    return this.http.post<{ message: string; signedDocumentUrl: string }>(
      `${this.apiUrl}/${invoiceId}/sign`, {}, { headers: this.headers });
  }

  createSupplier(dto: InvoiceSupplierCreateDto): Observable<InvoiceSupplierDto> {
    return this.http.post<InvoiceSupplierDto>(`${this.apiUrl}/supplier`, dto, { headers: this.headers });
  }

  /** Aprueba en bloque las facturas indicadas. */
  approve(invoiceIds: number[]): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(
      `${this.apiUrl}/approve`, { invoiceIds }, { headers: this.headers });
  }

  /** Rechaza en bloque las facturas indicadas. */
  reject(invoiceIds: number[]): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(
      `${this.apiUrl}/reject`, { invoiceIds }, { headers: this.headers });
  }

  /** Observa en bloque las facturas indicadas con un motivo del catálogo. */
  observe(invoiceIds: number[], invoiceObservationReasonId: number): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(
      `${this.apiUrl}/observe`, { invoiceIds, invoiceObservationReasonId }, { headers: this.headers });
  }
}
