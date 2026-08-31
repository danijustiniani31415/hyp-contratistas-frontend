import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { StaffProjectEmailDto } from '../dtos/staff-project-email.dto';
import { StaffProjectEmailCreateDto } from '../dtos/staff-project-email-create.dto';
import { StaffProjectEmailEditDto } from '../dtos/staff-project-email-edit.dto';
import { StaffProjectEmailFilterDto } from '../dtos/staff-project-email-filter.dto';
import { StaffProjectEmailFormDataDto } from '../dtos/staff-project-email-form-data.dto';

@Injectable({ providedIn: 'root' })
export class StaffProjectEmailService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/StaffProjectEmail`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  }

  getFormData(): Observable<StaffProjectEmailFormDataDto> {
    return this.http.get<StaffProjectEmailFormDataDto>(`${this.apiUrl}/form-data`, {
      headers: this.headers,
    });
  }

  getPaged(filters: StaffProjectEmailFilterDto): Observable<PagedResponseDTO<StaffProjectEmailDto>> {
    let params = new HttpParams().set('page', filters.page.toString());
    if (filters.projectId != null) params = params.set('projectId', filters.projectId.toString());
    if (filters.email) params = params.set('email', filters.email);
    if (filters.staffProjectEmailTypeId != null)
      params = params.set('staffProjectEmailTypeId', filters.staffProjectEmailTypeId.toString());

    return this.http.get<PagedResponseDTO<StaffProjectEmailDto>>(`${this.apiUrl}/paged`, {
      headers: this.headers,
      params,
    });
  }

  create(dto: StaffProjectEmailCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, {
      headers: this.headers,
    });
  }

  edit(dto: StaffProjectEmailEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, {
      headers: this.headers,
    });
  }

  delete(staffProjectEmailId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${staffProjectEmailId}`, {
      headers: this.headers,
    });
  }
}
