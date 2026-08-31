import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { RoleDto } from '../dtos/role.model';
import { RoleCreateDto } from '../dtos/roleCreate.model';
import { FeatureDto } from '../dtos/feature.model';

function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

@Injectable({ providedIn: 'root' })
export class RoleFeatureService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/role`;

  constructor(private http: HttpClient) {}

  getRolesPaged(
    page: number,
    search: string = '',
    pageSize: number = 10,
  ): Observable<PagedResponseDTO<RoleDto>> {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search.trim()) params.set('search', search.trim());
    return this.http.get<PagedResponseDTO<RoleDto>>(`${this.apiUrl}/paged?${params.toString()}`, {
      headers: buildAuthHeaders(),
    });
  }

  createRole(dto: RoleCreateDto): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto, { headers: buildAuthHeaders() });
  }

  getAllFeatures(): Observable<FeatureDto[]> {
    return this.http.get<FeatureDto[]>(`${this.apiUrl}/features/all`, {
      headers: buildAuthHeaders(),
    });
  }

  getRoleFeatureIds(roleId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/${roleId}/features`, {
      headers: buildAuthHeaders(),
    });
  }

  updateRoleDescription(roleId: number, dto: { roleDescription: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${roleId}`, dto, {
      headers: buildAuthHeaders(),
    });
  }

  updateRoleFeatures(roleId: number, featureIds: number[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/${roleId}/features`, { featureIds }, {
      headers: buildAuthHeaders(),
    });
  }
}
