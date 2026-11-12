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
  partidaId?: number | null;
}

export interface PedidoCreate {
  proyectoId: number;
  almacenId: number;
  contratoId?: number | null;
  observacion?: string;
  items: PedidoItemCreate[];
}

export interface Contrato {
  id: number;
  proyectoId: number;
  codigo: string;
  descripcion: string | null;
  vigenteDesde: string;
  vigenteHasta: string | null;
  activo: boolean;
}

export interface ContratoCreate {
  proyectoId: number;
  codigo: string;
  descripcion?: string;
  vigenteDesde: string;
  vigenteHasta?: string | null;
}

export interface Partida {
  id: number;
  proyectoId: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  monedaId: number | null;
  monedaCodigo: string | null;
  montoPresupuestado: number | null;
}

export interface PartidaCreate {
  proyectoId: number;
  codigo: string;
  nombre: string;
  monedaId?: number | null;
  montoPresupuestado?: number | null;
}

export interface Moneda {
  id: number;
  codigo: string;
  nombre: string;
}

export interface ConsumoPartida {
  partidaId: number;
  partidaCodigo: string;
  partidaNombre: string;
  monedaCodigo: string | null;
  montoPresupuestado: number | null;
  consumido: number;
  saldo: number | null;
  porcentajeConsumido: number | null;
}

/** Decisión sobre un ítem puntual en Visar/Aprobar — o se aprueba (completo o con cantidad
 * reducida) o se rechaza con motivo; el resto de ítems del pedido sigue su flujo normal. */
export interface PedidoItemDecision {
  pedidoItemId: number;
  rechazado: boolean;
  cantidadAprobada?: number | null;
  motivoRechazo?: string | null;
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
  cantidadAprobada: number | null;
  estado: 'PENDIENTE' | 'VISADO' | 'APROBADO' | 'RECHAZADO';
  motivoRechazo: string | null;
  partidaId: number | null;
  partidaNombre: string | null;
  cantidadEntregada: number | null;
  cantidadEnCompra: number;
  cantidadRecibidaAlmacen: number;
  cantidadDespachada: number;
  cantidadConfirmadaMina: number;
  /** Stock libre en el almacén del pedido (null si el pedido ya no está abierto). */
  stockLibre?: number | null;
}

export interface PedidoDetalle {
  id: number;
  codigo: string;
  proyectoNombre: string;
  almacenNombre: string;
  contratoId: number | null;
  contratoCodigo: string | null;
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

export interface PedidoItemHistorial {
  id: number;
  pedidoItemId: number;
  productoNombre: string;
  etapa: 'VISADO' | 'APROBACION';
  usuarioNombre: string;
  estadoResultante: 'VISADO' | 'APROBADO' | 'RECHAZADO';
  cantidadSolicitada: number;
  cantidadAprobada: number | null;
  motivoRechazo: string | null;
  creadoEn: string;
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

  /** decisiones: una por cada ítem en PENDIENTE (todos los del pedido en su primera visita). */
  visar(id: number, decisiones: PedidoItemDecision[]): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(
      `${this.apiUrl}/${id}/visar`,
      { items: decisiones },
      { headers: this.headers() },
    );
  }

  /** decisiones: una por cada ítem en VISADO (los que el Residente ya rechazó no se incluyen). */
  aprobar(id: number, decisiones: PedidoItemDecision[]): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(
      `${this.apiUrl}/${id}/aprobar`,
      { items: decisiones },
      { headers: this.headers() },
    );
  }

  getHistorial(id: number): Observable<PedidoItemHistorial[]> {
    return this.http.get<PedidoItemHistorial[]>(`${this.apiUrl}/${id}/historial`, { headers: this.headers() });
  }

  /** Sin `body` entrega todo lo pendiente; con `items` entrega solo esas cantidades (entrega parcial). */
  entregar(id: number, body?: { items?: { itemId: number; cantidad: number }[]; cerrarConSaldo?: boolean }): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(`${this.apiUrl}/${id}/entregar`, body ?? {}, { headers: this.headers() });
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

  listContratos(proyectoId: number): Observable<Contrato[]> {
    return this.http.get<Contrato[]>(`${this.apiUrl}/contratos?proyectoId=${proyectoId}`, {
      headers: this.headers(),
    });
  }

  crearContrato(dto: ContratoCreate): Observable<Contrato> {
    return this.http.post<Contrato>(`${this.apiUrl}/contratos`, dto, { headers: this.headers() });
  }

  listPartidas(proyectoId: number): Observable<Partida[]> {
    return this.http.get<Partida[]>(`${this.apiUrl}/partidas?proyectoId=${proyectoId}`, {
      headers: this.headers(),
    });
  }

  crearPartida(dto: PartidaCreate): Observable<Partida> {
    return this.http.post<Partida>(`${this.apiUrl}/partidas`, dto, { headers: this.headers() });
  }

  listMonedas(): Observable<Moneda[]> {
    return this.http.get<Moneda[]>(`${this.apiUrl}/monedas`, { headers: this.headers() });
  }

  getConsumoPartida(partidaId: number): Observable<ConsumoPartida> {
    return this.http.get<ConsumoPartida>(`${this.apiUrl}/partidas/${partidaId}/consumo`, { headers: this.headers() });
  }
}
