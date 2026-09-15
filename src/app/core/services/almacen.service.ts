import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface StockListItem {
  id: number;
  almacenId: number;
  almacenNombre: string;
  productoId: number;
  productoNombre: string;
  productoCodigo: string | null;
  unidadMedida: string;
  talla: string;
  cantidadActual: number;
  stockMinimo: number;
  stockMaximo: number | null;
  bajoMinimo: boolean;
}

export interface StockListResponse {
  data: StockListItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface MovimientoListItem {
  id: number;
  almacenNombre: string;
  productoNombre: string;
  talla: string;
  tipoMovimiento: string;
  cantidad: number;
  costoUnitario: number | null;
  usuarioNombre: string | null;
  creadoEn: string;
}

export interface MovimientoListResponse {
  data: MovimientoListItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface RegistrarMovimiento {
  almacenId: number;
  productoId: number;
  talla: string;
  tipoMovimiento: 'INGRESO' | 'SALIDA';
  cantidad: number;
  costoUnitario?: number | null;
}

export interface AjustarUmbrales {
  almacenId: number;
  productoId: number;
  talla: string;
  stockMinimo: number;
  stockMaximo?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AlmacenService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/almacen`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  listStock(almacenId: number | null, search: string, page: number, pageSize: number): Observable<StockListResponse> {
    const params = new URLSearchParams({ search, page: String(page), pageSize: String(pageSize) });
    if (almacenId) params.set('almacenId', String(almacenId));
    return this.http.get<StockListResponse>(`${this.apiUrl}/stock?${params}`, { headers: this.headers() });
  }

  listMovimientos(almacenId: number | null, page: number, pageSize: number): Observable<MovimientoListResponse> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (almacenId) params.set('almacenId', String(almacenId));
    return this.http.get<MovimientoListResponse>(`${this.apiUrl}/movimientos?${params}`, { headers: this.headers() });
  }

  registrarMovimiento(dto: RegistrarMovimiento): Observable<any> {
    return this.http.post(`${this.apiUrl}/movimientos`, dto, { headers: this.headers() });
  }

  ajustarUmbrales(dto: AjustarUmbrales): Observable<any> {
    return this.http.post(`${this.apiUrl}/umbrales`, dto, { headers: this.headers() });
  }
}
