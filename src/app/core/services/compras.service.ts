import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface Proveedor {
  id: number;
  razonSocial: string;
  ruc: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
}

export interface ProveedorCreate {
  razonSocial: string;
  ruc?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
}

export interface OrdenCompraItemCreate {
  productoId: number;
  talla: string;
  cantidadSolicitada: number;
  costoUnitario: number;
}

export interface OrdenCompraCreate {
  proveedorId: number;
  almacenId: number;
  observacion?: string;
  items: OrdenCompraItemCreate[];
}

export interface OrdenCompraListItem {
  id: number;
  codigo: string;
  proveedorNombre: string;
  almacenNombre: string;
  estado: string;
  cantidadItems: number;
  creadoEn: string;
}

export interface OrdenCompraListResponse {
  data: OrdenCompraListItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface OrdenCompraItemDetalle {
  id: number;
  productoNombre: string;
  productoCodigo: string | null;
  talla: string;
  cantidadSolicitada: number;
  costoUnitario: number;
  cantidadRecibida: number;
  cantidadPendiente: number;
}

export interface OrdenCompraDetalle {
  id: number;
  codigo: string;
  proveedorNombre: string;
  almacenNombre: string;
  solicitadoPorNombre: string;
  estado: string;
  observacion: string | null;
  creadoEn: string;
  items: OrdenCompraItemDetalle[];
}

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/compras`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  listProveedores(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(`${this.apiUrl}/proveedores`, { headers: this.headers() });
  }

  crearProveedor(dto: ProveedorCreate): Observable<Proveedor> {
    return this.http.post<Proveedor>(`${this.apiUrl}/proveedores`, dto, { headers: this.headers() });
  }

  crear(dto: OrdenCompraCreate): Observable<OrdenCompraDetalle> {
    return this.http.post<OrdenCompraDetalle>(`${this.apiUrl}/ordenes`, dto, { headers: this.headers() });
  }

  list(search: string, estado: string, page: number, pageSize: number): Observable<OrdenCompraListResponse> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    if (estado) params.set('estado', estado);
    return this.http.get<OrdenCompraListResponse>(`${this.apiUrl}/ordenes?${params}`, { headers: this.headers() });
  }

  getById(id: number): Observable<OrdenCompraDetalle> {
    return this.http.get<OrdenCompraDetalle>(`${this.apiUrl}/ordenes/${id}`, { headers: this.headers() });
  }

  recibirItem(ordenId: number, itemId: number, cantidad: number): Observable<OrdenCompraDetalle> {
    return this.http.post<OrdenCompraDetalle>(
      `${this.apiUrl}/ordenes/${ordenId}/items/${itemId}/recibir`,
      { cantidad },
      { headers: this.headers() },
    );
  }

  cancelar(id: number): Observable<OrdenCompraDetalle> {
    return this.http.post<OrdenCompraDetalle>(`${this.apiUrl}/ordenes/${id}/cancelar`, {}, { headers: this.headers() });
  }
}
