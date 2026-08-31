import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProjectCroquisItemDTO, CroquisLoteDTO } from '../dtos/croquis.dto';

@Injectable({ providedIn: 'root' })
export class CroquisService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ProjectCroquis`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { [header: string]: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** Lista de proyectos con su croquis asignado (si tienen). */
  getProjects(search?: string): Observable<ProjectCroquisItemDTO[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<ProjectCroquisItemDTO[]>(this.apiUrl, {
      params,
      headers: this.authHeaders(),
    });
  }

  /** Asigna o reemplaza el croquis de un proyecto. */
  assignCroquis(projectId: number, file: File): Observable<{ imageUrl: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imageUrl: string; message: string }>(
      `${this.apiUrl}/${projectId}`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  /** Lotes dibujados sobre un croquis. */
  getLotes(projectCroquisId: number): Observable<CroquisLoteDTO[]> {
    return this.http.get<CroquisLoteDTO[]>(`${this.apiUrl}/${projectCroquisId}/lotes`, {
      headers: this.authHeaders(),
    });
  }

  /** Guarda el conjunto completo de lotes de un croquis. */
  saveLotes(projectCroquisId: number, lotes: CroquisLoteDTO[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiUrl}/${projectCroquisId}/lotes`,
      { lotes },
      { headers: this.authHeaders() },
    );
  }
}
