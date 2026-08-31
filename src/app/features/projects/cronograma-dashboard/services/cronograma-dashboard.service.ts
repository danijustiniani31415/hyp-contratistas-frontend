import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CronogramaDashboardResponseDto } from '../dtos/cronograma-dashboard.dtos';

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

@Injectable({ providedIn: 'root' })
export class CronogramaDashboardService {
  private readonly base = `${environment.apiUrl}api/v1/cronograma-actividades`;

  constructor(private http: HttpClient) {}

  getDashboard(filters: {
    responsableId?: number;
    estado?: string;
  }): Observable<CronogramaDashboardResponseDto> {
    const qp: { [key: string]: string | number } = {};
    if (filters.responsableId != null) qp['responsableId'] = filters.responsableId;
    if (filters.estado) qp['estado'] = filters.estado;

    return this.http.get<CronogramaDashboardResponseDto>(`${this.base}/dashboard`, {
      headers: buildAuthHeaders(),
      params: qp,
    });
  }
}
