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
  /** Por qué se movió el stock (GUIA_REMISION, CARGA_EXCEL…); null = ajuste manual. */
  referenciaTipo: string | null;
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
  /** Texto original del Excel: si la fila se vinculó a un producto, el sistema lo aprende como alias. */
  alias?: string | null;
  nuevoProducto?: { nombre: string; marca?: string | null; categoriaId: number; unidadMedida: string; requiereTalla: boolean; tipoTalla?: string | null; presentacion?: string | null; unidadesPorPresentacion?: number | null } | null;
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

export interface KardexLinea {
  fecha: string;
  tipo: string;
  referencia: string | null;
  entradaCantidad: number;
  entradaCostoUnitario: number;
  entradaTotal: number;
  salidaCantidad: number;
  salidaCostoUnitario: number;
  salidaTotal: number;
  saldoCantidad: number;
  saldoCostoUnitario: number;
  saldoTotal: number;
}

export interface KardexValorizado {
  almacenNombre: string;
  productoNombre: string;
  unidadMedida: string;
  talla: string;
  color: string;
  saldoInicialCantidad: number;
  saldoInicialCostoUnitario: number;
  saldoInicialTotal: number;
  totalEntradas: number;
  totalSalidas: number;
  saldoFinalCantidad: number;
  saldoFinalTotal: number;
  lineas: KardexLinea[];
}

export interface InventarioListItem {
  id: number;
  almacenId: number;
  almacenNombre: string;
  fecha: string;
  estado: 'EN_CONTEO' | 'CERRADO' | 'ANULADO';
  observacion: string | null;
  totalItems: number;
  contados: number;
  cantidadAjustes: number;
  creadoEn: string;
}

export interface InventarioItem {
  id: number;
  productoId: number;
  productoNombre: string;
  productoCodigo: string | null;
  unidadMedida: string;
  talla: string;
  color: string;
  cantidadSistema: number;
  cantidadContada: number | null;
  cantidadAjuste: number | null;
  costoPromedio: number;
  motivo: string | null;
}

export interface InventarioDetalle extends InventarioListItem {
  items: InventarioItem[];
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

  kardex(almacenId: number, productoId: number, talla: string, color: string, desde: string, hasta: string): Observable<KardexValorizado> {
    const params = new URLSearchParams({ almacenId: String(almacenId), productoId: String(productoId), talla, color });
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    return this.http.get<KardexValorizado>(`${this.apiUrl}/kardex?${params}`, { headers: this.headers() });
  }

  listInventarios(almacenId?: number | null): Observable<InventarioListItem[]> {
    const params = almacenId ? `?almacenId=${almacenId}` : '';
    return this.http.get<InventarioListItem[]>(`${this.apiUrl}/inventarios${params}`, { headers: this.headers() });
  }

  getInventario(id: number): Observable<InventarioDetalle> {
    return this.http.get<InventarioDetalle>(`${this.apiUrl}/inventarios/${id}`, { headers: this.headers() });
  }

  crearInventario(almacenId: number, observacion: string): Observable<InventarioDetalle> {
    return this.http.post<InventarioDetalle>(`${this.apiUrl}/inventarios`, { almacenId, observacion }, { headers: this.headers() });
  }

  guardarConteo(id: number, items: { itemId: number; cantidadContada: number | null; motivo: string | null }[]): Observable<InventarioDetalle> {
    return this.http.put<InventarioDetalle>(`${this.apiUrl}/inventarios/${id}/conteo`, items, { headers: this.headers() });
  }

  agregarItemInventario(id: number, productoId: number, talla: string, color: string): Observable<InventarioDetalle> {
    return this.http.post<InventarioDetalle>(`${this.apiUrl}/inventarios/${id}/items`, { productoId, talla, color }, { headers: this.headers() });
  }

  cerrarInventario(id: number): Observable<InventarioDetalle> {
    return this.http.post<InventarioDetalle>(`${this.apiUrl}/inventarios/${id}/cerrar`, {}, { headers: this.headers() });
  }

  anularInventario(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/inventarios/${id}/anular`, {}, { headers: this.headers() });
  }
}
