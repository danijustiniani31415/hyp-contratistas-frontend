import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScheduleGetDTO } from '../dtos/schedule/schedule.model';
import { ScheduleCreateDTO } from '../dtos/schedule/scheduleCreate.model';
import { environment } from '../../../environments/environment';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../dtos/api/pagedResponse.model';
import { ProjectGetDTO } from '../dtos/project/project.model';
import { ScheduleFormData } from "../dtos/schedule/scheduleFormData.model";

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/schedule`;

  constructor(private http: HttpClient) {}

  getSchedulePaged(page: number): Observable<PagedResponseDTO<ScheduleGetDTO>> {
    const token = localStorage.getItem('access_token');
    return this.http.get<PagedResponseDTO<ScheduleGetDTO>>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  createSchedule(dto: ScheduleCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  getFormData(): Observable<ScheduleFormData> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ScheduleFormData>(`${this.apiUrl}/form-data`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
