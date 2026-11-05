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
  color: string;
  cantidadActual: number;
  costoPromedio: number;
  valorTotal: number;
  stockMinimo: number;
  stockMaximo: number | null;
  bajoMinimo: boolean;
}

export interface ReposicionSugerida {
  almacenId: number;
  almacenNombre: string;
  productoId: number;
  productoNombre: string;
  talla: string;
  color: string;
  cantidadActual: number;
  stockMinimo: number;
  stockMaximo: number | null;
  cantidadSugerida: number;
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
  color: string;
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
  color?: string;
  tipoMovimiento: 'INGRESO' | 'SALIDA';
  cantidad: number;
  costoUnitario?: number | null;
}

export interface AjustarUmbrales {
  almacenId: number;
  productoId: number;
  talla: string;
  color?: string;
  stockMinimo: number;
  stockMaximo?: number | null;
}

export interface CargaMasivaFila {
  productoId?: number | null;
  nuevoProducto?: { nombre: string; categoriaId: number; unidadMedida: string; requiereTalla: boolean; tipoTalla?: string | null } | null;
  talla: string;
  color: string;
  cantidad: number;
  costoUnitario?: number | null;
}

export interface CargaMasivaResultado {
  registradas: number;
  productosCreados: number;
  fallidas: number;
  filas: { fila: number; ok: boolean; mensaje: string | null; productoId: number | null; productoCreado: boolean }[];
}

export interface AlmacenGestion {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  activo: boolean;
  direccion: string | null;
  ubigeo: string | null;
  codigoEstablecimientoSunat: string;
}

export interface AlmacenActualizar {
  /** Si viene, renombra el almacén (el nombre es interno: SUNAT no lo ve). */
  nombre?: string;
  direccion: string;
  ubigeo: string;
  codigoEstablecimientoSunat: string;
  /** Si viene, activa o desactiva el almacén (no se borra: tiene historial). */
  activo?: boolean;
}

export interface AlmacenCrear {
  nombre: string;
  tipo: 'CENTRAL' | 'PROYECTO';
  direccion: string;
  ubigeo: string;
  codigoEstablecimientoSunat: string;
}

@Injectable({ providedIn: 'root' })
export class AlmacenService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/almacen`;
  private readonly almacenesUrl = `${environment.apiUrl}api/v1/almacenes`;

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

  cargaMasiva(almacenId: number, filas: CargaMasivaFila[]): Observable<CargaMasivaResultado> {
    return this.http.post<CargaMasivaResultado>(`${this.almacenesUrl}/carga-masiva`, { almacenId, filas }, { headers: this.headers() });
  }

  listAlmacenes(): Observable<AlmacenGestion[]> {
    return this.http.get<AlmacenGestion[]>(this.almacenesUrl, { headers: this.headers() });
  }

  crearAlmacen(dto: AlmacenCrear): Observable<AlmacenGestion> {
    return this.http.post<AlmacenGestion>(this.almacenesUrl, dto, { headers: this.headers() });
  }

  actualizarAlmacen(id: number, dto: AlmacenActualizar): Observable<AlmacenGestion> {
    return this.http.put<AlmacenGestion>(`${this.almacenesUrl}/${id}`, dto, { headers: this.headers() });
  }

  listReposicionSugerida(almacenId?: number | null): Observable<ReposicionSugerida[]> {
    const params = almacenId ? `?almacenId=${almacenId}` : '';
    return this.http.get<ReposicionSugerida[]>(`${this.apiUrl}/reposicion-sugerida${params}`, { headers: this.headers() });
  }
}
