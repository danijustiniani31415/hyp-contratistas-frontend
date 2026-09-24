import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface EntregaEppItemCreate {
  productoId: number;
  talla: string;
  color: string;
  cantidad: number;
}

export interface EntregaEppCreate {
  personaId: number;
  almacenId: number;
  observacion?: string;
  items: EntregaEppItemCreate[];
}

export interface EntregaEppListItem {
  id: number;
  personaNombre: string;
  almacenNombre: string;
  entregadoPorNombre: string;
  cantidadItems: number;
  creadoEn: string;
}

export interface EntregaEppListResponse {
  data: EntregaEppListItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface EntregaEppItemDetalle {
  id: number;
  productoNombre: string;
  productoCodigo: string | null;
  talla: string;
  color: string;
  cantidad: number;
}

export interface EntregaEppDetalle {
  id: number;
  personaId: number;
  personaNombre: string;
  almacenNombre: string;
  entregadoPorNombre: string;
  observacion: string | null;
  creadoEn: string;
  items: EntregaEppItemDetalle[];
}

@Injectable({ providedIn: 'root' })
export class EppService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/epp`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  crear(dto: EntregaEppCreate): Observable<EntregaEppDetalle> {
    return this.http.post<EntregaEppDetalle>(this.apiUrl, dto, { headers: this.headers() });
  }

  list(search: string, personaId: number | null, page: number, pageSize: number): Observable<EntregaEppListResponse> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);
    if (personaId) params.set('personaId', String(personaId));
    return this.http.get<EntregaEppListResponse>(`${this.apiUrl}?${params}`, { headers: this.headers() });
  }

  getById(id: number): Observable<EntregaEppDetalle> {
    return this.http.get<EntregaEppDetalle>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }
}
