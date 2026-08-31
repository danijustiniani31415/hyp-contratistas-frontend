import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LearningCategoryDto } from './learning.model';

/**
 * Lectura del Centro de aprendizaje (videos-guía). Compartido entre el /inicio
 * (dashboard) y el /auth/login, por eso vive en `core/`.
 */
@Injectable({ providedIn: 'root' })
export class LearningService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/learning`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Videos del modal del login (público, sin sesión) — solo contratistas. */
  getLogin(): Observable<LearningCategoryDto[]> {
    return this.http.get<LearningCategoryDto[]>(`${this.apiUrl}/login`);
  }

  /** Grupos del Centro de aprendizaje de /inicio, ya filtrados por rol en el backend. */
  getInicio(): Observable<LearningCategoryDto[]> {
    return this.http.get<LearningCategoryDto[]>(`${this.apiUrl}/inicio`, {
      headers: this.authHeaders(),
    });
  }
}
