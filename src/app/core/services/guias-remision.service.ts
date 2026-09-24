import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface GuiaRemisionItemCreate {
  productoId: number;
  talla: string;
  color: string;
  cantidad: number;
  unidadMedida: string;
  pedidoItemId?: number | null;
}

export interface GuiaRemisionCreate {
  motivoTraslado: string;
  modalidadTraslado: string;
  fechaTraslado: string;
  pesoBrutoTotal: number;
  pesoBrutoUnidad: string;
  numBultos?: number;
  almacenOrigenId: number;
  almacenDestinoId?: number;
  destinatarioRuc?: string;
  destinatarioRazonSocial?: string;
  transportistaRuc?: string;
  transportistaRazonSocial?: string;
  vehiculoPlaca?: string;
  conductorNombres?: string;
  conductorLicencia?: string;
  observacion?: string;
  items: GuiaRemisionItemCreate[];
}

export interface GuiaRemisionListItem {
  id: number;
  codigo: string;
  estado: string;
  almacenOrigenNombre: string;
  almacenDestinoNombre: string | null;
  fechaTraslado: string;
  cantidadItems: number;
  creadoEn: string;
}

export interface GuiaRemisionListResponse {
  data: GuiaRemisionListItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface GuiaRemisionItemDetalle {
  id: number;
  productoNombre: string;
  productoCodigo: string | null;
  talla: string;
  color: string;
  cantidad: number;
  unidadMedida: string;
  pedidoItemId: number | null;
  pedidoCodigo: string | null;
  cantidadConfirmada: number | null;
  confirmadoEn: string | null;
  confirmadoPorNombre: string | null;
}

export interface ConfirmarRecepcionItem {
  itemId: number;
  cantidadConfirmada: number;
}

export interface GuiaRemisionDetalle {
  id: number;
  serie: string;
  numero: number;
  codigo: string;
  estado: string;
  motivoTraslado: string;
  modalidadTraslado: string;
  fechaTraslado: string;
  pesoBrutoTotal: number;
  pesoBrutoUnidad: string;
  numBultos: number | null;
  almacenOrigenNombre: string;
  almacenDestinoNombre: string | null;
  destinatarioRuc: string | null;
  destinatarioRazonSocial: string | null;
  transportistaRuc: string | null;
  transportistaRazonSocial: string | null;
  vehiculoPlaca: string | null;
  conductorNombres: string | null;
  conductorLicencia: string | null;
  observacion: string | null;
  creadoPorNombre: string;
  creadoEn: string;
  ticket: string | null;
  cdrCodigoRespuesta: string | null;
  cdrDescripcion: string | null;
  enviadoEn: string | null;
  respondidoEn: string | null;
  confirmacionPendiente: boolean;
  items: GuiaRemisionItemDetalle[];
}

@Injectable({ providedIn: 'root' })
export class GuiasRemisionService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/guias-remision`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  crear(dto: GuiaRemisionCreate): Observable<GuiaRemisionDetalle> {
    return this.http.post<GuiaRemisionDetalle>(this.apiUrl, dto, { headers: this.headers() });
  }

  list(search: string, estado: string, page: number, pageSize: number): Observable<GuiaRemisionListResponse> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    if (estado) params.set('estado', estado);
    return this.http.get<GuiaRemisionListResponse>(`${this.apiUrl}?${params}`, { headers: this.headers() });
  }

  getById(id: number): Observable<GuiaRemisionDetalle> {
    return this.http.get<GuiaRemisionDetalle>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  enviar(id: number): Observable<GuiaRemisionDetalle> {
    return this.http.post<GuiaRemisionDetalle>(`${this.apiUrl}/${id}/enviar`, {}, { headers: this.headers() });
  }

  consultarEstado(id: number): Observable<GuiaRemisionDetalle> {
    return this.http.post<GuiaRemisionDetalle>(`${this.apiUrl}/${id}/consultar-estado`, {}, { headers: this.headers() });
  }

  confirmarRecepcion(id: number, items: ConfirmarRecepcionItem[]): Observable<GuiaRemisionDetalle> {
    return this.http.post<GuiaRemisionDetalle>(`${this.apiUrl}/${id}/confirmar-recepcion`, { items }, { headers: this.headers() });
  }
}
