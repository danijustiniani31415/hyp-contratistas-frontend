import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface Categoria {
  id: number;
  nombre: string;
  tipo: string;
}

export interface CategoriaCreate {
  nombre: string;
  tipo: string;
}

export interface ProductoListItem {
  id: number;
  codigo: string | null;
  nombre: string;
  /** Marca como dato propio (el nombre ya la incluye). */
  marca?: string | null;
  categoriaNombre: string;
  categoriaTipo: string;
  unidadMedida: string;
  requiereTalla: boolean;
  tipoTalla: string | null;
  requiereColor: boolean;
  esRetornable: boolean;
  /** Cómo viene en la factura (PAQUETE, CAJA…) y cuántas unidades trae; el stock va en unidades. */
  presentacion?: string | null;
  unidadesPorPresentacion?: number | null;
  activo: boolean;
}

export interface Talla {
  valor: string;
}

export interface ProductoListResponse {
  data: ProductoListItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface ProductoCreate {
  codigo?: string | null;
  nombre: string;
  /** Opcional: si el nombre no la menciona, el sistema la agrega al final del nombre. */
  marca?: string | null;
  /** Otras formas de escribir el nombre (el sistema las aprende). En una edición reemplaza la lista. */
  alias?: string[] | null;
  descripcion?: string | null;
  categoriaId: number;
  unidadMedida: string;
  requiereTalla: boolean;
  tipoTalla?: string | null;
  requiereColor: boolean;
  esRetornable: boolean;
  presentacion?: string | null;
  unidadesPorPresentacion?: number | null;
}

export interface ProductoUpdate extends ProductoCreate {
  activo: boolean;
}

export interface ProductoDetalle extends ProductoUpdate {
  id: number;
  categoriaNombre: string;
}

export interface SugerenciaProducto {
  id: number;
  nombre: string;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/catalogo`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  listCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}/categorias`, { headers: this.headers() });
  }

  crearCategoria(dto: CategoriaCreate): Observable<Categoria> {
    return this.http.post<Categoria>(`${this.apiUrl}/categorias`, dto, { headers: this.headers() });
  }

  listProductos(search: string, page: number, pageSize: number): Observable<ProductoListResponse> {
    const params = new URLSearchParams({ search, page: String(page), pageSize: String(pageSize) });
    return this.http.get<ProductoListResponse>(`${this.apiUrl}/productos?${params}`, { headers: this.headers() });
  }

  crearProducto(dto: ProductoCreate): Observable<any> {
    return this.http.post(`${this.apiUrl}/productos`, dto, { headers: this.headers() });
  }

  getProducto(id: number): Observable<ProductoDetalle> {
    return this.http.get<ProductoDetalle>(`${this.apiUrl}/productos/${id}`, { headers: this.headers() });
  }

  actualizarProducto(id: number, dto: ProductoUpdate): Observable<any> {
    return this.http.put(`${this.apiUrl}/productos/${id}`, dto, { headers: this.headers() });
  }

  sugerirProductos(nombre: string): Observable<SugerenciaProducto[]> {
    const params = new URLSearchParams({ nombre });
    return this.http.get<SugerenciaProducto[]>(`${this.apiUrl}/productos/sugerencias?${params}`, { headers: this.headers() });
  }

  listAlias(): Observable<{ productoId: number; alias: string }[]> {
    return this.http.get<{ productoId: number; alias: string }[]>(`${this.apiUrl}/productos/alias`, { headers: this.headers() });
  }

  /** Ids de los productos con alguna referencia (stock, movimientos, pedidos, compras, guías, EPP, préstamos). */
  listUso(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/productos/uso`, { headers: this.headers() });
  }

  resolverDuplicados(principalId: number, duplicadoIds: number[]): Observable<{ desactivados: number; omitidos: string[] }> {
    return this.http.post<{ desactivados: number; omitidos: string[] }>(
      `${this.apiUrl}/productos/duplicados/resolver`, { principalId, duplicadoIds }, { headers: this.headers() });
  }

  listTallas(tipo: string): Observable<Talla[]> {
    const params = new URLSearchParams({ tipo });
    return this.http.get<Talla[]>(`${this.apiUrl}/tallas?${params}`, { headers: this.headers() });
  }
}
