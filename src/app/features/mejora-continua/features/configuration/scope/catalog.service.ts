import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

export interface CatalogTypeDTO {
  catalogTypeId: number;
  catalogTypeName: string;
  active: boolean;
}

export interface CatalogTypeCreateDTO {
  catalogTypeName: string;
  active: boolean;
}

export interface CatalogTypeEditDTO {
  catalogTypeId: number;
  catalogTypeName: string;
  active: boolean;
}

export interface CatalogItemDTO {
  catalogItemId: number;
  catalogTypeId: number;
  catalogTypeName: string;
  catalogItemDescription: string;
  active: boolean;
}

export interface CatalogItemCreateDTO {
  catalogTypeId: number;
  catalogItemDescription: string;
  active: boolean;
}

export interface CatalogItemEditDTO {
  catalogItemId: number;
  catalogTypeId: number;
  catalogItemDescription: string;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly base = `${environment.apiUrl}api/v1/mejora-continua/catalog`;

  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  // ── Catalog Types ──────────────────────────────────────────────────────────

  getTypes(): Observable<CatalogTypeDTO[]> {
    return this.http.get<CatalogTypeDTO[]>(`${this.base}/types`, {
      headers: this.authHeaders(),
    });
  }

  createType(dto: CatalogTypeCreateDTO): Observable<void> {
    return this.http.post<void>(`${this.base}/types`, dto, {
      headers: this.authHeaders(),
    });
  }

  updateType(dto: CatalogTypeEditDTO): Observable<void> {
    return this.http.put<void>(`${this.base}/types`, dto, {
      headers: this.authHeaders(),
    });
  }

  deleteType(catalogTypeId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/types/${catalogTypeId}`, {
      headers: this.authHeaders(),
    });
  }

  // ── Catalog Items ──────────────────────────────────────────────────────────

  getItemsByType(catalogTypeId: number): Observable<CatalogItemDTO[]> {
    return this.http.get<CatalogItemDTO[]>(`${this.base}/items/${catalogTypeId}`, {
      headers: this.authHeaders(),
    });
  }

  getFullTree(): Observable<CatalogItemDTO[]> {
    return this.http.get<CatalogItemDTO[]>(`${this.base}/full-tree`, {
      headers: this.authHeaders(),
    });
  }

  createItem(dto: CatalogItemCreateDTO): Observable<void> {
    return this.http.post<void>(`${this.base}/items`, dto, {
      headers: this.authHeaders(),
    });
  }

  updateItem(dto: CatalogItemEditDTO): Observable<void> {
    return this.http.put<void>(`${this.base}/items`, dto, {
      headers: this.authHeaders(),
    });
  }

  deleteItem(catalogItemId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/items/${catalogItemId}`, {
      headers: this.authHeaders(),
    });
  }
}
