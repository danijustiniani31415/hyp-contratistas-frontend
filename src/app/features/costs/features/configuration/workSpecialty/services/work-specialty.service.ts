import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { WorkSpecialtyDto } from '../dtos/work-specialty.dto';
import { WorkSpecialtyCreateDto } from '../dtos/work-specialty-create.dto';
import { WorkSpecialtyEditDto } from '../dtos/work-specialty-edit.dto';
import { WorkSpecialtyFilterDto } from '../dtos/work-specialty-filter.dto';

@Injectable({ providedIn: 'root' })
export class WorkSpecialtyService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/WorkSpecialty`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(filters: WorkSpecialtyFilterDto): Observable<PagedResponseDTO<WorkSpecialtyDto>> {
    let params = new HttpParams().set('page', filters.page.toString());
    if (filters.description) params = params.set('description', filters.description);
    if (filters.active !== null && filters.active !== undefined)
      params = params.set('active', filters.active.toString());

    return this.http.get<PagedResponseDTO<WorkSpecialtyDto>>(`${this.apiUrl}/paged`, {
      headers: this.headers,
      params,
    });
  }

  create(dto: WorkSpecialtyCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  edit(dto: WorkSpecialtyEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  delete(workSpecialtyId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${workSpecialtyId}`, {
      headers: this.headers,
    });
  }
}
