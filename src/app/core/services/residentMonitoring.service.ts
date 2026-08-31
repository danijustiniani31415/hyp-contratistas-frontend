import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TrackingFiltersDto, TrackingResultDto } from '../dtos/residentMonitoring/residentMonitoringDto.model';
import { SelectedFilters } from '../../features/projects/resident-monitoring-measurement/resident-monitoring-measurement';

@Injectable({
  providedIn: 'root',
})
export class ResidentMonitoringService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/residentMonitoring`;

  constructor(private http: HttpClient) {}

  getResidentMonitoring(filters: SelectedFilters): Observable<TrackingResultDto> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();

    if (filters.projectId) params = params.set('projectId', filters.projectId);
    if (filters.residentUserId) params = params.set('residentUserId', filters.residentUserId);
    if (filters.month) params = params.set('month', filters.month);
    if (filters.year) params = params.set('year', filters.year);
    console.log(params);
    return this.http.get<TrackingResultDto>(`${this.apiUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
  }

  getFilters(): Observable<TrackingFiltersDto> {
    const token = localStorage.getItem('access_token');
    return this.http.get<TrackingFiltersDto>(`${this.apiUrl}/filters`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
