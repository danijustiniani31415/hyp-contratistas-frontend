import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

export interface ScopeItemDTO {
  scopeItemId: number;
  lessonAreaId: number;
  catalogItemId: number;
  catalogItemDescription: string;
  catalogTypeName: string;
  scopeItemParentId: number | null;
  displayOrder: number;
  active: boolean;
  children: ScopeItemDTO[];
}

// Misma semántica que ScopeTemplateItemNodeDTO:
//   • nodeId puede ser un scope_item_id real o un temporal negativo (-1, -2, ...).
//   • parentNodeId apunta a otro nodeId del mismo payload.
//   • Un mismo catalogItemId puede aparecer varias veces bajo padres distintos.
export interface ScopeItemNodeDTO {
  nodeId: number;
  parentNodeId: number | null;
  catalogItemId: number;
  displayOrder: number;
}

export interface ScopeItemUpsertDTO {
  lessonAreaId: number;
  items: ScopeItemNodeDTO[];
}

// Un nodo del árbol de la plantilla.
//   • Lectura (GET): nodeId = scope_template_item_id real, parentNodeId apunta a otro nodeId real.
//   • Escritura (POST/PUT): nodeId puede ser un id real (preservar nodo existente) o un
//     temporal negativo (-1, -2, ...) generado por el cliente. El backend solo lo usa
//     para resolver el árbol durante la inserción.
//   • Un mismo `catalogItemId` puede aparecer varias veces bajo padres distintos —
//     por eso `catalogItemId` NO sirve como clave de árbol.
export interface ScopeTemplateItemNodeDTO {
  nodeId: number;
  parentNodeId: number | null;
  catalogItemId: number;
  catalogItemDescription: string;
  displayOrder: number;
}

export interface ScopeTemplateDTO {
  scopeTemplateId: number;
  templateName: string;
  active: boolean;
  items: ScopeTemplateItemNodeDTO[];
}

export interface ScopeTemplateCreateDTO {
  templateName: string;
  items: ScopeTemplateItemNodeDTO[];
}

export interface ScopeTemplateUpdateDTO {
  scopeTemplateId: number;
  templateName: string;
  items: ScopeTemplateItemNodeDTO[];
}

@Injectable({ providedIn: 'root' })
export class ScopeService {
  private readonly base = `${environment.apiUrl}api/v1/mejora-continua/scope`;

  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getScopeTree(lessonAreaId: number): Observable<ScopeItemDTO[]> {
    return this.http.get<ScopeItemDTO[]>(`${this.base}/tree/${lessonAreaId}`, {
      headers: this.authHeaders(),
    });
  }

  upsertScope(dto: ScopeItemUpsertDTO): Observable<unknown> {
    return this.http.put(`${this.base}/tree`, dto, { headers: this.authHeaders() });
  }

  getTemplates(): Observable<ScopeTemplateDTO[]> {
    return this.http.get<ScopeTemplateDTO[]>(`${this.base}/templates`, {
      headers: this.authHeaders(),
    });
  }

  createTemplate(dto: ScopeTemplateCreateDTO): Observable<unknown> {
    return this.http.post(`${this.base}/templates`, dto, { headers: this.authHeaders() });
  }

  updateTemplate(dto: ScopeTemplateUpdateDTO): Observable<unknown> {
    return this.http.put(`${this.base}/templates`, dto, { headers: this.authHeaders() });
  }

  deleteTemplate(scopeTemplateId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/templates/${scopeTemplateId}`, {
      headers: this.authHeaders(),
    });
  }
}
