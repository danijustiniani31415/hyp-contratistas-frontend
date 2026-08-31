import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MilestoneScheduleHistoryGetDTO } from "../dtos/milestoneScheduleHistory/milestoneScheduleHistory.model";
import { MilestoneScheduleHistoryCreateDTO } from '../dtos/milestoneScheduleHistory/milestoneScheduleHistoryCreate.model';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';

@Injectable({
  providedIn: 'root',
})
export class MilestoneScheduleHistoryService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/milestoneScheduleHistory`;

  constructor(private http: HttpClient) {}

  getAllMilestoneScheduleHistory(filters: any): Observable<MilestoneScheduleHistoryGetDTO[]> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<MilestoneScheduleHistoryGetDTO[]>(`${this.apiUrl}`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  createMilestoneScheduleHistory(dto: MilestoneScheduleHistoryCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
