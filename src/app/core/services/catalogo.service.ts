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
  categoriaNombre: string;
  categoriaTipo: string;
  unidadMedida: string;
  requiereTalla: boolean;
  tipoTalla: string | null;
  esRetornable: boolean;
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
  descripcion?: string | null;
  categoriaId: number;
  unidadMedida: string;
  requiereTalla: boolean;
  tipoTalla?: string | null;
  esRetornable: boolean;
}

export interface ProductoUpdate extends ProductoCreate {
  activo: boolean;
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

  actualizarProducto(id: number, dto: ProductoUpdate): Observable<any> {
    return this.http.put(`${this.apiUrl}/productos/${id}`, dto, { headers: this.headers() });
  }

  sugerirProductos(nombre: string): Observable<SugerenciaProducto[]> {
    const params = new URLSearchParams({ nombre });
    return this.http.get<SugerenciaProducto[]>(`${this.apiUrl}/productos/sugerencias?${params}`, { headers: this.headers() });
  }

  listTallas(tipo: string): Observable<Talla[]> {
    const params = new URLSearchParams({ tipo });
    return this.http.get<Talla[]>(`${this.apiUrl}/tallas?${params}`, { headers: this.headers() });
  }
}
