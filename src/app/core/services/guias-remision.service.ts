import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface GuiaRemisionItemCreate {
  /** null = línea libre (sin inventario): requiere `descripcion` y no mueve stock. */
  productoId: number | null;
  descripcion?: string;
  esBienTercero?: boolean;
  /** Solo del formulario (no se guarda): distingue línea libre de producto sin elegir todavía. */
  libre?: boolean;
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
  conductorDni?: string;
  conductorApellidos?: string;
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
  productoId: number | null;
  esLineaLibre: boolean;
  esBienTercero: boolean;
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
  numero: number | null;
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
  conductorDni: string | null;
  conductorApellidos: string | null;
  emisorRuc: string;
  emisorRazonSocial: string;
  almacenOrigenDireccion: string | null;
  almacenOrigenUbigeo: string | null;
  almacenDestinoDireccion: string | null;
  almacenDestinoUbigeo: string | null;
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

/** Datos maestros de transporte: se registran una vez y rellenan el formulario de la guía. */
export interface Transportista { id: number; ruc: string; razonSocial: string; nroMtc: string | null; activo: boolean }
export interface Vehiculo { id: number; placa: string; nroCirculacion: string | null; activo: boolean }
export interface Conductor { id: number; numDoc: string; nombres: string; apellidos: string; licencia: string; activo: boolean }

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

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  // ── Datos maestros de transporte ──
  listTransportistas(): Observable<Transportista[]> {
    return this.http.get<Transportista[]>(`${this.apiUrl}/maestros/transportistas`, { headers: this.headers() });
  }
  guardarTransportista(id: number | null, dto: Omit<Transportista, 'id'>): Observable<Transportista> {
    const url = `${this.apiUrl}/maestros/transportistas`;
    return id
      ? this.http.put<Transportista>(`${url}/${id}`, dto, { headers: this.headers() })
      : this.http.post<Transportista>(url, dto, { headers: this.headers() });
  }
  listVehiculos(): Observable<Vehiculo[]> {
    return this.http.get<Vehiculo[]>(`${this.apiUrl}/maestros/vehiculos`, { headers: this.headers() });
  }
  guardarVehiculo(id: number | null, dto: Omit<Vehiculo, 'id'>): Observable<Vehiculo> {
    const url = `${this.apiUrl}/maestros/vehiculos`;
    return id
      ? this.http.put<Vehiculo>(`${url}/${id}`, dto, { headers: this.headers() })
      : this.http.post<Vehiculo>(url, dto, { headers: this.headers() });
  }
  listConductores(): Observable<Conductor[]> {
    return this.http.get<Conductor[]>(`${this.apiUrl}/maestros/conductores`, { headers: this.headers() });
  }
  guardarConductor(id: number | null, dto: Omit<Conductor, 'id'>): Observable<Conductor> {
    const url = `${this.apiUrl}/maestros/conductores`;
    return id
      ? this.http.put<Conductor>(`${url}/${id}`, dto, { headers: this.headers() })
      : this.http.post<Conductor>(url, dto, { headers: this.headers() });
  }

  anular(id: number): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${id}/anular`, {}, { headers: this.headers() });
  }

  consultarEstado(id: number): Observable<GuiaRemisionDetalle> {
    return this.http.post<GuiaRemisionDetalle>(`${this.apiUrl}/${id}/consultar-estado`, {}, { headers: this.headers() });
  }

  confirmarRecepcion(id: number, items: ConfirmarRecepcionItem[]): Observable<GuiaRemisionDetalle> {
    return this.http.post<GuiaRemisionDetalle>(`${this.apiUrl}/${id}/confirmar-recepcion`, { items }, { headers: this.headers() });
  }
}
