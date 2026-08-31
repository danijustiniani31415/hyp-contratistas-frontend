import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { ProjectDto } from '../dtos/project.dto';
import { ProjectCreateDto } from '../dtos/project-create.dto';
import { ProjectEditDto } from '../dtos/project-edit.dto';
import { ProjectFilterDto } from '../dtos/project-filter.dto';
import { ContributorLookupDto } from '../dtos/company-lookup.dto';
import { ResponsableLookupDto, ResponsableTipo } from '../dtos/responsable-lookup.dto';

@Injectable({ providedIn: 'root' })
export class ProyectoService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/project`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(filter: ProjectFilterDto): Observable<PagedResponseDTO<ProjectDto>> {
    let params = new HttpParams().set('page', filter.page.toString());
    if (filter.ruc) params = params.set('ruc', filter.ruc);
    if (filter.razonSocial) params = params.set('razonSocial', filter.razonSocial);
    if (filter.projectDescription) params = params.set('projectDescription', filter.projectDescription);
    return this.http.get<PagedResponseDTO<ProjectDto>>(`${this.apiUrl}/paged`, {
      headers: this.headers,
      params,
    });
  }

  create(dto: ProjectCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  edit(dto: ProjectEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  delete(projectId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${projectId}`, {
      headers: this.headers,
    });
  }

  getCompanyByRuc(ruc: string): Observable<ContributorLookupDto> {
    return this.http.get<ContributorLookupDto>(`${this.apiUrl}/company-lookup/${ruc}`, {
      headers: this.headers,
    });
  }

  getResponsables(tipo: ResponsableTipo): Observable<ResponsableLookupDto[]> {
    return this.http.get<ResponsableLookupDto[]>(`${this.apiUrl}/responsables`, {
      headers: this.headers,
      params: { tipo },
    });
  }
}
