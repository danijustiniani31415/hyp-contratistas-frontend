import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CatalogoItemDTO,
  CatalogoTipo,
  CreateCatalogoItemBody,
  UpdateCatalogoItemBody,
} from '../../dtos/arquitectura-comercial/catalogo.model';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/arquitectura-comercial/catalogos`;

  constructor(private http: HttpClient) {}

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  getItems(tipo: CatalogoTipo, soloActivos = true): Observable<CatalogoItemDTO[]> {
    return this.http.get<CatalogoItemDTO[]>(`${this.apiUrl}/${tipo}`, {
      params: { soloActivos: String(soloActivos) },
      headers: this.authHeaders(),
    });
  }

  crear(tipo: CatalogoTipo, body: CreateCatalogoItemBody): Observable<CatalogoItemDTO> {
    return this.http.post<CatalogoItemDTO>(`${this.apiUrl}/${tipo}`, body, { headers: this.authHeaders() });
  }

  actualizar(id: number, body: UpdateCatalogoItemBody): Observable<CatalogoItemDTO> {
    return this.http.put<CatalogoItemDTO>(`${this.apiUrl}/items/${id}`, body, { headers: this.authHeaders() });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/items/${id}`, { headers: this.authHeaders() });
  }
}
