import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import {
  AreaTypeDto,
  AreaTypeCreateDto,
  AreaTypeEditDto,
  AreaTypeSimpleDto,
} from '../dtos/areaType.model';

@Injectable({ providedIn: 'root' })
export class AreaTypeService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/area-type`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(page: number, pageSize: number = 10): Observable<PagedResponseDTO<AreaTypeDto>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PagedResponseDTO<AreaTypeDto>>(`${this.apiUrl}/paged`, {
      params,
      headers: this.authHeaders(),
    });
  }

  getSimple(): Observable<AreaTypeSimpleDto[]> {
    return this.http.get<AreaTypeSimpleDto[]>(`${this.apiUrl}/simple`, {
      headers: this.authHeaders(),
    });
  }

  create(dto: AreaTypeCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.authHeaders() });
  }

  update(dto: AreaTypeEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, { headers: this.authHeaders() });
  }

  delete(areaTypeId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${areaTypeId}`, {
      headers: this.authHeaders(),
    });
  }
}
