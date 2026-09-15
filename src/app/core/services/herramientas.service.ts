import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface PrestamoItemCreate {
  productoId: number;
  talla: string;
  cantidad: number;
}

export interface PrestamoCreate {
  almacenId: number;
  personaId: number;
  proyectoId?: number | null;
  fechaDevolucionEstimada?: string | null;
  observacion?: string;
  items: PrestamoItemCreate[];
}

export interface PrestamoListItem {
  id: number;
  codigo: string;
  personaNombre: string;
  almacenNombre: string;
  estado: string;
  cantidadItems: number;
  cantidadPendientes: number;
  creadoEn: string;
}

export interface PrestamoListResponse {
  data: PrestamoListItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface PrestamoItemDetalle {
  id: number;
  productoNombre: string;
  productoCodigo: string | null;
  talla: string;
  cantidad: number;
  estado: string;
  devueltoPorNombre: string | null;
  fechaDevolucion: string | null;
  observacionDevolucion: string | null;
}

export interface PrestamoDetalle {
  id: number;
  codigo: string;
  almacenNombre: string;
  personaId: number;
  personaNombre: string;
  proyectoNombre: string | null;
  prestadoPorNombre: string;
  fechaDevolucionEstimada: string | null;
  observacion: string | null;
  creadoEn: string;
  estado: string;
  items: PrestamoItemDetalle[];
}

@Injectable({ providedIn: 'root' })
export class HerramientasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/prestamos`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  crear(dto: PrestamoCreate): Observable<PrestamoDetalle> {
    return this.http.post<PrestamoDetalle>(this.apiUrl, dto, { headers: this.headers() });
  }

  list(soloAbiertos: boolean, page: number, pageSize: number): Observable<PrestamoListResponse> {
    const params = new URLSearchParams({ soloAbiertos: String(soloAbiertos), page: String(page), pageSize: String(pageSize) });
    return this.http.get<PrestamoListResponse>(`${this.apiUrl}?${params}`, { headers: this.headers() });
  }

  getById(id: number): Observable<PrestamoDetalle> {
    return this.http.get<PrestamoDetalle>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  devolverItem(prestamoId: number, itemId: number, estado: string, observacion?: string): Observable<PrestamoDetalle> {
    return this.http.post<PrestamoDetalle>(
      `${this.apiUrl}/${prestamoId}/items/${itemId}/devolver`,
      { estado, observacion },
      { headers: this.headers() },
    );
  }
}
