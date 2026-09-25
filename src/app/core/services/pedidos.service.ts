import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';
import { PendienteCompra } from './compras.service';

export interface PendienteDespacho {
  pedidoItemId: number;
  pedidoId: number;
  pedidoCodigo: string;
  proyectoNombre: string;
  almacenId: number;
  productoId: number;
  productoNombre: string;
  talla: string;
  color: string;
  unidadMedida: string;
  cantidadPendienteDeDespacho: number;
}

export interface PedidoItemCreate {
  productoId: number;
  talla: string;
  color: string;
  observacion?: string;
  cantidadSolicitada: number;
}

export interface PedidoCreate {
  proyectoId: number;
  almacenId: number;
  observacion?: string;
  items: PedidoItemCreate[];
}

export interface PedidoListItem {
  id: number;
  codigo: string;
  proyectoNombre: string;
  almacenNombre: string;
  solicitanteNombre: string;
  estado: string;
  cantidadItems: number;
  creadoEn: string;
}

export interface PedidoListResponse {
  data: PedidoListItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface PedidoItemDetalle {
  id: number;
  productoNombre: string;
  productoCodigo: string | null;
  unidadMedida: string;
  talla: string;
  color: string;
  observacion: string | null;
  cantidadSolicitada: number;
  cantidadEntregada: number | null;
  cantidadEnCompra: number;
  cantidadRecibidaAlmacen: number;
  cantidadDespachada: number;
  cantidadConfirmadaMina: number;
}

export interface PedidoDetalle {
  id: number;
  codigo: string;
  proyectoNombre: string;
  almacenNombre: string;
  solicitanteUsuarioSistemaId: number;
  solicitanteNombre: string;
  estado: string;
  observacion: string | null;
  motivoRechazo: string | null;
  visadoPorNombre: string | null;
  visadoEn: string | null;
  aprobadoPorNombre: string | null;
  aprobadoEn: string | null;
  entregadoPorNombre: string | null;
  entregadoEn: string | null;
  creadoEn: string;
  items: PedidoItemDetalle[];
}

export interface PedidoDestinatarios {
  visadores: string[];
  aprobadores: string[];
  entregadores: string[];
}

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/pedidos`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  crear(dto: PedidoCreate): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(this.apiUrl, dto, { headers: this.headers() });
  }

  list(estado: string, page: number, pageSize: number): Observable<PedidoListResponse> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (estado) params.set('estado', estado);
    return this.http.get<PedidoListResponse>(`${this.apiUrl}?${params}`, { headers: this.headers() });
  }

  getById(id: number): Observable<PedidoDetalle> {
    return this.http.get<PedidoDetalle>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  visar(id: number): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(`${this.apiUrl}/${id}/visar`, {}, { headers: this.headers() });
  }

  rechazarVisado(id: number, motivoRechazo: string): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(`${this.apiUrl}/${id}/rechazar-visado`, { motivoRechazo }, { headers: this.headers() });
  }

  aprobar(id: number): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(`${this.apiUrl}/${id}/aprobar`, {}, { headers: this.headers() });
  }

  rechazar(id: number, motivoRechazo: string): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(`${this.apiUrl}/${id}/rechazar`, { motivoRechazo }, { headers: this.headers() });
  }

  entregar(id: number): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(`${this.apiUrl}/${id}/entregar`, {}, { headers: this.headers() });
  }

  cancelar(id: number): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(`${this.apiUrl}/${id}/cancelar`, {}, { headers: this.headers() });
  }

  listPendientesDeCompra(): Observable<PendienteCompra[]> {
    return this.http.get<PendienteCompra[]>(`${this.apiUrl}/pendientes-compra`, { headers: this.headers() });
  }

  listPendientesDeDespacho(): Observable<PendienteDespacho[]> {
    return this.http.get<PendienteDespacho[]>(`${this.apiUrl}/pendientes-despacho`, { headers: this.headers() });
  }

  getDestinatarios(proyectoId: number): Observable<PedidoDestinatarios> {
    return this.http.get<PedidoDestinatarios>(`${this.apiUrl}/destinatarios?proyectoId=${proyectoId}`, {
      headers: this.headers(),
    });
  }
}
