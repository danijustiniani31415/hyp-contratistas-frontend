import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { ProjectLinkDto } from '../dtos/project-link.dto';
import { ProjectLinkCreateDto } from '../dtos/project-link-create.dto';
import { ProjectLinkUpdateDto } from '../dtos/project-link-update.dto';
import { ProjectLinkFilterDto } from '../dtos/project-link-filter.dto';
import { ProjectLinkFormDataDto } from '../dtos/project-link-form-data.dto';

@Injectable({ providedIn: 'root' })
export class ProjectLinkService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ProjectLink`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(filters: ProjectLinkFilterDto): Observable<PagedResponseDTO<ProjectLinkDto>> {
    let params = new HttpParams().set('page', filters.page.toString());
    if (filters.projectId) params = params.set('projectId', filters.projectId.toString());

    return this.http.get<PagedResponseDTO<ProjectLinkDto>>(`${this.apiUrl}/paged`, {
      headers: this.headers,
      params,
    });
  }

  getFormData(): Observable<ProjectLinkFormDataDto> {
    return this.http.get<ProjectLinkFormDataDto>(`${this.apiUrl}/form-data`, {
      headers: this.headers,
    });
  }

  create(dto: ProjectLinkCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  update(dto: ProjectLinkUpdateDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  delete(projectLinkId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${projectLinkId}`, {
      headers: this.headers,
    });
  }
}
