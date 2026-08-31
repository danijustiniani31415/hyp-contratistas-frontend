import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../core/dtos/api/ApiMessage.model';
import {
  AreaScopeTreeDto,
  AreaScopeBranchDto,
  AreaScopeWorkerDto,
  AreaScopeUpdateParentDto,
} from '../dtos/areaScope.model';

@Injectable({ providedIn: 'root' })
export class AreaScopeService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/area-scope`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getTree(): Observable<AreaScopeTreeDto[]> {
    return this.http.get<AreaScopeTreeDto[]>(`${this.apiUrl}/tree`, {
      headers: this.authHeaders(),
    });
  }

  getWorkers(areaScopeId: number): Observable<AreaScopeWorkerDto[]> {
    return this.http.get<AreaScopeWorkerDto[]>(`${this.apiUrl}/${areaScopeId}/workers`, {
      headers: this.authHeaders(),
    });
  }

  createBranch(dto: AreaScopeBranchDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}/branch`, dto, {
      headers: this.authHeaders(),
    });
  }

  updateParent(areaScopeId: number, dto: AreaScopeUpdateParentDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}/${areaScopeId}/parent`, dto, {
      headers: this.authHeaders(),
    });
  }

  delete(areaScopeId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${areaScopeId}`, {
      headers: this.authHeaders(),
    });
  }
}
