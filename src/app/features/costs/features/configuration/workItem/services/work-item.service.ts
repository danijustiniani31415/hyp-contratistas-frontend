import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { WorkItemCategoryOptionDto, WorkItemDto, WorkItemSyncResultDto } from '../dtos/work-item.dto';
import { WorkItemCreateDto } from '../dtos/work-item-create.dto';
import { WorkItemEditDto } from '../dtos/work-item-edit.dto';
import { WorkItemFilterDto } from '../dtos/work-item-filter.dto';

@Injectable({ providedIn: 'root' })
export class WorkItemService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/WorkItem`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(filters: WorkItemFilterDto): Observable<PagedResponseDTO<WorkItemDto>> {
    let params = new HttpParams().set('page', filters.page.toString());
    if (filters.description) params = params.set('description', filters.description);
    if (filters.hasValorizationForm !== null && filters.hasValorizationForm !== undefined)
      params = params.set('hasValorizationForm', filters.hasValorizationForm.toString());
    if (filters.workItemCategoryId !== null && filters.workItemCategoryId !== undefined)
      params = params.set('workItemCategoryId', filters.workItemCategoryId.toString());
    if (filters.active !== null && filters.active !== undefined)
      params = params.set('active', filters.active.toString());

    return this.http.get<PagedResponseDTO<WorkItemDto>>(`${this.apiUrl}/paged`, {
      headers: this.headers,
      params,
    });
  }

  getCategories(): Observable<WorkItemCategoryOptionDto[]> {
    return this.http.get<WorkItemCategoryOptionDto[]>(`${this.apiUrl}/categories`, { headers: this.headers });
  }

  sync(): Observable<WorkItemSyncResultDto> {
    return this.http.post<WorkItemSyncResultDto>(`${this.apiUrl}/sync`, {}, { headers: this.headers });
  }

  create(dto: WorkItemCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  edit(dto: WorkItemEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  delete(workItemId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${workItemId}`, {
      headers: this.headers,
    });
  }
}
