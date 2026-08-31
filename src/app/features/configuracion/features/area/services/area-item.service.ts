import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import {
  AreaItemDto,
  AreaItemCreateDto,
  AreaItemEditDto,
  AreaItemSimpleDto,
  AreaItemFilterDto,
} from '../dtos/areaItem.model';

@Injectable({ providedIn: 'root' })
export class AreaItemService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/area-item`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(filter: AreaItemFilterDto): Observable<PagedResponseDTO<AreaItemDto>> {
    let params = new HttpParams().set('page', filter.page.toString());
    if (filter.pageSize != null) params = params.set('pageSize', filter.pageSize.toString());
    if (filter.areaTypeId != null) params = params.set('areaTypeId', filter.areaTypeId.toString());
    if (filter.active != null) params = params.set('active', String(filter.active));
    if (filter.search) params = params.set('search', filter.search);

    return this.http.get<PagedResponseDTO<AreaItemDto>>(`${this.apiUrl}/paged`, {
      params,
      headers: this.authHeaders(),
    });
  }

  getSimple(areaTypeId?: number | null): Observable<AreaItemSimpleDto[]> {
    let params = new HttpParams();
    if (areaTypeId != null) params = params.set('areaTypeId', areaTypeId.toString());
    return this.http.get<AreaItemSimpleDto[]>(`${this.apiUrl}/simple`, {
      params,
      headers: this.authHeaders(),
    });
  }

  create(dto: AreaItemCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.authHeaders() });
  }

  update(dto: AreaItemEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, { headers: this.authHeaders() });
  }

  delete(areaItemId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${areaItemId}`, {
      headers: this.authHeaders(),
    });
  }
}
