import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ChecklistPlantillaListDto,
  ChecklistPlantillaDetalleDto,
  ChecklistPlantillaItemDto,
  ChecklistPlantillaItemCreateDto,
  ChecklistPlantillaItemEditDto,
  ChecklistProyectoResumenDto,
  ChecklistProyectoDetalleDto,
  ChecklistItemToggleDto,
  ChecklistActivarDto,
} from './checklist.dtos';

@Injectable({ providedIn: 'root' })
export class ChecklistService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/checklist`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  // ─── Plantillas ──────────────────────────────────────────────────────────────

  getPlantillas(): Observable<ChecklistPlantillaListDto[]> {
    return this.http.get<ChecklistPlantillaListDto[]>(`${this.base}/plantillas`, {
      headers: this.authHeaders(),
    });
  }

  getPlantillaDetalle(plantillaId: number): Observable<ChecklistPlantillaDetalleDto> {
    return this.http.get<ChecklistPlantillaDetalleDto>(`${this.base}/plantillas/${plantillaId}`, {
      headers: this.authHeaders(),
    });
  }

  addItemToPlantilla(
    plantillaId: number,
    dto: ChecklistPlantillaItemCreateDto,
  ): Observable<ChecklistPlantillaItemDto> {
    return this.http.post<ChecklistPlantillaItemDto>(
      `${this.base}/plantillas/${plantillaId}/items`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  updatePlantillaItem(itemId: number, dto: ChecklistPlantillaItemEditDto): Observable<void> {
    return this.http.put<void>(`${this.base}/plantillas/items/${itemId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  // ─── Proyecto ────────────────────────────────────────────────────────────────

  getResumenProyecto(proyectoId: number): Observable<ChecklistProyectoResumenDto> {
    return this.http.get<ChecklistProyectoResumenDto>(
      `${this.base}/proyecto/${proyectoId}/resumen`,
      { headers: this.authHeaders() },
    );
  }

  getChecklistDetalle(checklistProyectoId: number): Observable<ChecklistProyectoDetalleDto> {
    return this.http.get<ChecklistProyectoDetalleDto>(`${this.base}/${checklistProyectoId}`, {
      headers: this.authHeaders(),
    });
  }

  activarChecklist(proyectoId: number, dto: ChecklistActivarDto): Observable<ChecklistProyectoDetalleDto> {
    return this.http.post<ChecklistProyectoDetalleDto>(
      `${this.base}/proyecto/${proyectoId}/activar`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  toggleItem(
    checklistProyectoItemId: number,
    dto: ChecklistItemToggleDto,
  ): Observable<{ porcentaje: number; estado: string }> {
    return this.http.patch<{ porcentaje: number; estado: string }>(
      `${this.base}/items/${checklistProyectoItemId}`,
      dto,
      { headers: this.authHeaders() },
    );
  }
}
