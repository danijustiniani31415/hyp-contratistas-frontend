import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface CatalogoValor {
  id: number;
  tipo: string;
  valor: string;
  activo: boolean;
}

/**
 * Catálogo genérico de listas fijas (banco, tipo AFP/ONP, categoría laboral, ...) — "todo debe
 * ser modificable desde el frontend", nunca <option> hardcodeado. Cargo/TipoVinculo/Empresa
 * contratista NO usan esto (son tablas propias con FK) — solo texto plano sin relaciones.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoValorService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/catalogo-valores`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  list(tipo: string): Observable<CatalogoValor[]> {
    const params = new URLSearchParams({ tipo });
    return this.http.get<CatalogoValor[]>(`${this.apiUrl}?${params}`, { headers: this.headers() });
  }

  crear(tipo: string, valor: string): Observable<CatalogoValor> {
    return this.http.post<CatalogoValor>(this.apiUrl, { tipo, valor }, { headers: this.headers() });
  }

  actualizar(id: number, valor: string, activo: boolean): Observable<CatalogoValor> {
    return this.http.put<CatalogoValor>(`${this.apiUrl}/${id}`, { valor, activo }, { headers: this.headers() });
  }
}
