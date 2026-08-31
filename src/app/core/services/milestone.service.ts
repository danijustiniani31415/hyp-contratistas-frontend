import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../dtos/api/pagedResponse.model';
import { MilestoneGetDTO } from "../dtos/milestone/milestone.model";
import { MilestoneCreateDTO } from '../dtos/milestone/milestoneCreate.model';
import { MilestoneEditDTO } from '../dtos/milestone/milestoneEdit.model';
import { environment } from '../../../environments/environment';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';

@Injectable({
  providedIn: 'root',
})
export class MilestoneService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/milestone`;

  constructor(private http: HttpClient) {}

  getAllMilestone(): Observable<MilestoneGetDTO[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<MilestoneGetDTO[]>(`${this.apiUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  getMilestonePaged(page: number): Observable<PagedResponseDTO<MilestoneGetDTO>> {
    const token = localStorage.getItem('access_token');
    return this.http.get<PagedResponseDTO<MilestoneGetDTO>>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  createMilestone(dto: MilestoneCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  editMilestone(dto: MilestoneEditDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  deleteMilestone(milestoneId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${milestoneId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
