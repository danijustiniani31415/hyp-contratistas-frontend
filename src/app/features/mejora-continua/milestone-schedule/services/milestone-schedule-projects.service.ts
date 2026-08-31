import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProjectPagedDTO } from '../../../../core/dtos/project/projectPaged.model';

@Injectable({
  providedIn: 'root',
})
export class MilestoneScheduleProjectsService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/project`;

  constructor(private http: HttpClient) {}

  getProjectPagedWithResidents(
    page: number,
    search?: string,
    pageSize?: number,
  ): Observable<ProjectPagedDTO> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams().set('page', String(page));
    if (pageSize) params = params.set('pageSize', String(pageSize));
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<ProjectPagedDTO>(`${this.apiUrl}/paged-with-residents`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
  }

  uploadProjectFoto(projectId: number, file: File): Observable<{ message: string; fotoUrl: string }> {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('foto', file);
    return this.http.patch<{ message: string; fotoUrl: string }>(
      `${this.apiUrl}/${projectId}/foto`,
      formData,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
}
