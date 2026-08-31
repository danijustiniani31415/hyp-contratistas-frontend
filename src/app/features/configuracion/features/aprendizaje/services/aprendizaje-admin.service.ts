import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import {
  LearningAdminDataDto,
  LearningCategoryCreateDto,
  LearningCategoryEditDto,
  LearningVideoCreateDto,
  LearningVideoEditDto,
} from '../dtos/aprendizaje.dto';

/** CRUD del Centro de aprendizaje (protegido por featureKey configuracion.aprendizaje). */
@Injectable({ providedIn: 'root' })
export class AprendizajeAdminService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/learning/admin`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga todo (grupos + videos + catálogos de superficie y roles) en una sola petición. */
  getAll(): Observable<LearningAdminDataDto> {
    return this.http.get<LearningAdminDataDto>(this.apiUrl, { headers: this.authHeaders() });
  }

  // ── Grupos ──────────────────────────────────────────────────────────────
  createCategory(dto: LearningCategoryCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}/categoria`, dto, { headers: this.authHeaders() });
  }

  editCategory(id: number, dto: LearningCategoryEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}/categoria/${id}`, dto, { headers: this.authHeaders() });
  }

  toggleCategory(id: number): Observable<{ activo: boolean }> {
    return this.http.patch<{ activo: boolean }>(`${this.apiUrl}/categoria/${id}/toggle`, {}, { headers: this.authHeaders() });
  }

  deleteCategory(id: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/categoria/${id}`, { headers: this.authHeaders() });
  }

  // ── Videos ──────────────────────────────────────────────────────────────
  createVideo(dto: LearningVideoCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}/video`, dto, { headers: this.authHeaders() });
  }

  editVideo(id: number, dto: LearningVideoEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}/video/${id}`, dto, { headers: this.authHeaders() });
  }

  toggleVideo(id: number): Observable<{ activo: boolean }> {
    return this.http.patch<{ activo: boolean }>(`${this.apiUrl}/video/${id}/toggle`, {}, { headers: this.authHeaders() });
  }

  deleteVideo(id: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/video/${id}`, { headers: this.authHeaders() });
  }
}
