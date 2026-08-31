import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import {
  LessonAreaConfigItemDto,
  ToggleLessonAreaResultDto,
  SetLessonAreaFlagResultDto,
} from '../dtos/lesson-area.dto';

@Injectable({ providedIn: 'root' })
export class LessonAreaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/mejora-continua/lesson-areas`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getAll(): Observable<LessonAreaConfigItemDto[]> {
    return this.http.get<LessonAreaConfigItemDto[]>(this.apiUrl, { headers: this.authHeaders() });
  }

  toggle(areaScopeId: number): Observable<ToggleLessonAreaResultDto> {
    return this.http.put<ToggleLessonAreaResultDto>(
      `${this.apiUrl}/toggle/${areaScopeId}`,
      {},
      { headers: this.authHeaders() },
    );
  }

  setIncludeInForm(areaScopeId: number, value: boolean): Observable<SetLessonAreaFlagResultDto> {
    return this.http.put<SetLessonAreaFlagResultDto>(
      `${this.apiUrl}/include-in-form/${areaScopeId}?value=${value}`,
      {},
      { headers: this.authHeaders() },
    );
  }

  setIncludeDescendants(areaScopeId: number, value: boolean): Observable<SetLessonAreaFlagResultDto> {
    return this.http.put<SetLessonAreaFlagResultDto>(
      `${this.apiUrl}/include-descendants/${areaScopeId}?value=${value}`,
      {},
      { headers: this.authHeaders() },
    );
  }

  setIncludeAsIndependent(areaScopeId: number, value: boolean): Observable<SetLessonAreaFlagResultDto> {
    return this.http.put<SetLessonAreaFlagResultDto>(
      `${this.apiUrl}/include-as-independent/${areaScopeId}?value=${value}`,
      {},
      { headers: this.authHeaders() },
    );
  }
}
