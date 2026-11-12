import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface CotizacionListItem {
  id: number;
  codigo: string;
  almacenNombre: string;
  estado: 'ABIERTA' | 'ADJUDICADA' | 'CANCELADA';
  items: number;
  cotizaciones: number;
  resumen: string | null;
  creadoEn: string;
}

export interface CotizacionItem {
  id: number;
  productoNombre: string;
  talla: string;
  color: string;
  cantidad: number;
  pedidoCodigo: string | null;
  cotizacionAdjudicadaId: number | null;
}

export interface CotizacionRespuesta {
  id: number;
  proveedorId: number;
  proveedorNombre: string;
  plazoDias: number | null;
  condicionPago: string | null;
  observacion: string | null;
  precios: Record<string, number>;
  total: number;
  completa: boolean;
}

export interface CotizacionDetalle {
  id: number;
  codigo: string;
  almacenId: number;
  almacenNombre: string;
  estado: 'ABIERTA' | 'ADJUDICADA' | 'CANCELADA';
  observacion: string | null;
  motivoAdjudicacion: string | null;
  ordenesGeneradas: string | null;
  creadoPorNombre: string;
  creadoEn: string;
  items: CotizacionItem[];
  cotizaciones: CotizacionRespuesta[];
}

export interface CotizacionCrear {
  almacenId: number;
  observacion?: string;
  pedidoItemIds: number[];
  reposicion: { productoId: number; talla: string; color: string; cantidad: number }[];
}

/** Cotizaciones comparativas: pedir precios a varios proveedores, compararlos y adjudicar generando las órdenes de compra. */
@Injectable({ providedIn: 'root' })
export class CotizacionesService {
  private readonly url = `${environment.apiUrl}api/v1/cotizaciones`;

  constructor(private http: HttpClient, private auth: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  listar(estado: string): Observable<CotizacionListItem[]> {
    return this.http.get<CotizacionListItem[]>(this.url, { headers: this.headers(), params: estado ? { estado } : {} });
  }

  detalle(id: number): Observable<CotizacionDetalle> {
    return this.http.get<CotizacionDetalle>(`${this.url}/${id}`, { headers: this.headers() });
  }

  crear(body: CotizacionCrear): Observable<CotizacionDetalle> {
    return this.http.post<CotizacionDetalle>(this.url, body, { headers: this.headers() });
  }

  agregarCotizacion(
    id: number,
    body: { proveedorId: number; plazoDias: number | null; condicionPago: string; observacion: string; precios: { itemId: number; precio: number | null }[] },
  ): Observable<CotizacionDetalle> {
    return this.http.post<CotizacionDetalle>(`${this.url}/${id}/cotizaciones`, body, { headers: this.headers() });
  }

  eliminarCotizacion(id: number, cotizacionId: number): Observable<CotizacionDetalle> {
    return this.http.delete<CotizacionDetalle>(`${this.url}/${id}/cotizaciones/${cotizacionId}`, { headers: this.headers() });
  }

  adjudicar(id: number, body: { motivo: string; selecciones: { itemId: number; cotizacionId: number }[] }): Observable<CotizacionDetalle> {
    return this.http.post<CotizacionDetalle>(`${this.url}/${id}/adjudicar`, body, { headers: this.headers() });
  }

  cancelar(id: number): Observable<CotizacionDetalle> {
    return this.http.post<CotizacionDetalle>(`${this.url}/${id}/cancelar`, {}, { headers: this.headers() });
  }
}
