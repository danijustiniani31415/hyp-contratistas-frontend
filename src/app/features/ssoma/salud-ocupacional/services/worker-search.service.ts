import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from './http-base';
import { WorkerSearchItemDto } from '../dtos/worker-search.model';

@Injectable({ providedIn: 'root' })
export class WorkerSearchService {
  private readonly apiUrl = `${SALUD_OCUPACIONAL_BASE}/workers`;

  constructor(private http: HttpClient) {}

  search(q: string, limit = 20): Observable<WorkerSearchItemDto[]> {
    const params = new HttpParams().set('q', q).set('limit', limit);
    return this.http.get<WorkerSearchItemDto[]>(`${this.apiUrl}/search`, {
      params,
      headers: buildAuthHeaders(),
    });
  }

  getMe(): Observable<WorkerSearchItemDto> {
    return this.http.get<WorkerSearchItemDto>(`${this.apiUrl}/me`, {
      headers: buildAuthHeaders(),
    });
  }
}
