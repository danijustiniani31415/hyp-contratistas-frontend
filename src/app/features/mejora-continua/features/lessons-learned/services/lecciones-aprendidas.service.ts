import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { LessonListPagedDTO, LessonsPagedWithFiltersDTO } from '../dtos/lessonList.model';
import { LessonDetailDTO } from '../dtos/lessonDetail.model';
import { LessonFiltersDTO } from '../dtos/lessonFilters.model';
import { ScopeItemDTO } from '../dtos/scope-item.model';
import { LessonAreaConfigItemDto } from '../../configuration/lesson-areas/dtos/lesson-area.dto';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { LessonUploadWindowDTO } from '../dtos/lessonUploadWindow.model';

@Injectable({
  providedIn: 'root',
})
export class LeccionesAprendidasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/lesson`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getLessonsUsingFilters(filters: any): Observable<LessonListPagedDTO> {
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<LessonListPagedDTO>(this.apiUrl, {
      params,
      headers: this.authHeaders(),
    });
  }

  getLessonsPagedWithFilters(filters: any): Observable<LessonsPagedWithFiltersDTO> {
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<LessonsPagedWithFiltersDTO>(`${this.apiUrl}/paged-with-filters`, {
      params,
      headers: this.authHeaders(),
    });
  }

  getFiltersCreate(lessonAreaId: number): Observable<ScopeItemDTO[]> {
    const params = new HttpParams().set('lessonAreaId', lessonAreaId);
    return this.http.get<ScopeItemDTO[]>(`${this.apiUrl}/filters/create`, {
      params,
      headers: this.authHeaders(),
    });
  }

  /** Devuelve las ramas habilitadas con al menos un scope_item, para el dropdown de área al crear una lección. */
  getLessonAreasWithScope(): Observable<LessonAreaConfigItemDto[]> {
    return this.http.get<LessonAreaConfigItemDto[]>(
      `${environment.apiUrl}api/v1/mejora-continua/lesson-areas/with-scope`,
      { headers: this.authHeaders() },
    );
  }

  /**
   * Áreas para el FILTRO del listado: incluye contenedores (include_descendants),
   * no solo las de formulario. Así se puede filtrar por un área padre que agrupa
   * lecciones aunque no esté marcada para el formulario.
   */
  getLessonAreasForFilter(): Observable<LessonAreaConfigItemDto[]> {
    return this.http.get<LessonAreaConfigItemDto[]>(
      `${environment.apiUrl}api/v1/mejora-continua/lesson-areas/for-filter`,
      { headers: this.authHeaders() },
    );
  }

  createLesson(form: FormData): Observable<unknown> {
    return this.http.post(this.apiUrl, form, {
      headers: this.authHeaders(),
    });
  }

  updateLesson(id: number, form: FormData): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}/${id}`, form, {
      headers: this.authHeaders(),
    });
  }

  approveLesson(id: number): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}/${id}/approve`, {}, {
      headers: this.authHeaders(),
    });
  }

  rejectLesson(id: number, comment: string | null): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}/${id}/reject`, { comment }, {
      headers: this.authHeaders(),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Métodos migrados desde core/services/lesson.service.ts. Cubren los
  // endpoints específicos de la página /mejora-continua/lessons-learned
  // (lectura, borrado y exportación a Excel de una lección).
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Estado de la ventana de subida de hoy. Durante la ventana de revisión de la
   * jefatura (últimos 2 días hábiles del mes + fines de semana/feriados
   * intermedios) `canUpload` es false y el botón "Nuevo registro" se deshabilita.
   */
  getUploadWindow(): Observable<LessonUploadWindowDTO> {
    return this.http.get<LessonUploadWindowDTO>(`${this.apiUrl}/upload-window`, {
      headers: this.authHeaders(),
    });
  }

  getById(id: number | null): Observable<LessonDetailDTO> {
    return this.http.get<LessonDetailDTO>(`${this.apiUrl}/${id}`, {
      headers: this.authHeaders(),
    });
  }

  deleteLesson(lessonId: number | undefined): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${lessonId}`, {
      headers: this.authHeaders(),
    });
  }

  getExcel(filters: any): Observable<Blob> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(`${this.apiUrl}/export-excel`, {
      params,
      headers: this.authHeaders(),
      responseType: 'blob',
    });
  }
}
