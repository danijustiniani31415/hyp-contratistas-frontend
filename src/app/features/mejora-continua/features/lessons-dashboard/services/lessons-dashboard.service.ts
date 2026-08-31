import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  LessonsDashboardDataDTO,
  LessonsDashboardFiltersDTO,
  SelectedDashboardFilters,
} from '../dtos/dashboard.model';
import { LessonAreaConfigItemDto } from '../../configuration/lesson-areas/dtos/lesson-area.dto';

@Injectable({ providedIn: 'root' })
export class LessonsDashboardService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/mejora-continua/lessons-dashboard`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getData(filters: SelectedDashboardFilters): Observable<LessonsDashboardDataDTO> {
    let params = new HttpParams();
    if (filters.periodDate) params = params.set('periodDate', filters.periodDate);
    if (filters.userId) params = params.set('userId', String(filters.userId));
    if (filters.approvalStatus) params = params.set('approvalStatus', filters.approvalStatus);
    if (filters.obraOficinaStaffId)
      params = params.set('obraOficinaStaffId', String(filters.obraOficinaStaffId));
    (filters.lessonAreaIds ?? []).forEach((id) => {
      params = params.append('lessonAreaIds', String(id));
    });
    (filters.projectIds ?? []).forEach((id) => {
      params = params.append('projectIds', String(id));
    });

    return this.http.get<LessonsDashboardDataDTO>(`${this.apiUrl}/data`, {
      params,
      headers: this.authHeaders(),
    });
  }

  /** Árbol de áreas para el filtro en cascada (mismo endpoint que Lecciones Aprendidas). */
  getLessonAreasForFilter(): Observable<LessonAreaConfigItemDto[]> {
    return this.http.get<LessonAreaConfigItemDto[]>(
      `${environment.apiUrl}api/v1/mejora-continua/lesson-areas/for-filter`,
      { headers: this.authHeaders() },
    );
  }

  getFilters(): Observable<LessonsDashboardFiltersDTO> {
    return this.http.get<LessonsDashboardFiltersDTO>(`${this.apiUrl}/filters`, {
      headers: this.authHeaders(),
    });
  }

  sendPdf(form: FormData): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/send-pdf`, form, { headers: this.authHeaders() });
  }
}
