import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { WorkItemCategoryDto, WorkItemCategorySyncResultDto, WorkSpecialtyOptionDto } from '../dtos/work-item-category.dto';
import { WorkItemCategoryCreateDto } from '../dtos/work-item-category-create.dto';
import { WorkItemCategoryEditDto } from '../dtos/work-item-category-edit.dto';
import { WorkItemCategoryFilterDto } from '../dtos/work-item-category-filter.dto';

@Injectable({ providedIn: 'root' })
export class WorkItemCategoryService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/WorkItemCategory`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(filters: WorkItemCategoryFilterDto): Observable<PagedResponseDTO<WorkItemCategoryDto>> {
    let params = new HttpParams().set('page', filters.page.toString());
    if (filters.description) params = params.set('description', filters.description);
    if (filters.hasInstructivo !== null && filters.hasInstructivo !== undefined)
      params = params.set('hasInstructivo', filters.hasInstructivo.toString());
    if (filters.hasClause !== null && filters.hasClause !== undefined)
      params = params.set('hasClause', filters.hasClause.toString());
    if (filters.workSpecialtyId !== null && filters.workSpecialtyId !== undefined)
      params = params.set('workSpecialtyId', filters.workSpecialtyId.toString());
    if (filters.active !== null && filters.active !== undefined)
      params = params.set('active', filters.active.toString());

    return this.http.get<PagedResponseDTO<WorkItemCategoryDto>>(`${this.apiUrl}/paged`, {
      headers: this.headers,
      params,
    });
  }

  getSpecialties(): Observable<WorkSpecialtyOptionDto[]> {
    return this.http.get<WorkSpecialtyOptionDto[]>(`${this.apiUrl}/specialties`, { headers: this.headers });
  }

  create(dto: WorkItemCategoryCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  edit(dto: WorkItemCategoryEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  delete(workItemCategoryId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${workItemCategoryId}`, {
      headers: this.headers,
    });
  }

  syncInstructivos(): Observable<WorkItemCategorySyncResultDto> {
    return this.http.post<WorkItemCategorySyncResultDto>(
      `${this.apiUrl}/sync-instructivos`,
      {},
      { headers: this.headers },
    );
  }

  uploadInstructivo(workItemCategoryId: number, file: File): Observable<ApiMessageDTO> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${workItemCategoryId}/upload-instructivo`,
      form,
      { headers: this.headers },
    );
  }
}
