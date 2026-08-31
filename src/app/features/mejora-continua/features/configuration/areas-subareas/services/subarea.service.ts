import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubAreaPagedDTO } from '../dtos/subAreaPaged.model';
import { SubAreaSimpleDTO } from '../dtos/subAreaSimple.model';
import { SubAreaCreateDTO } from '../dtos/subAreaCreate.model';
import { SubAreaEditDTO } from '../dtos/subAreaEdit.model';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';

@Injectable({
  providedIn: 'root',
})
export class SubAreaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/subarea`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getAllSubAreaSimple(): Observable<SubAreaSimpleDTO[]> {
    return this.http.get<SubAreaSimpleDTO[]>(`${this.apiUrl}/simple/all`, {
      headers: this.authHeaders(),
    });
  }

  getSubAreaSimple(areaId: number): Observable<SubAreaSimpleDTO[]> {
    return this.http.get<SubAreaSimpleDTO[]>(`${this.apiUrl}/simple`, {
      params: new HttpParams().set('areaId', areaId),
      headers: this.authHeaders(),
    });
  }

  getSubAreaPaged(page: number, areaId?: number | null): Observable<SubAreaPagedDTO> {
    let params = new HttpParams().set('page', page);
    if (areaId) params = params.set('areaId', areaId);
    return this.http.get<SubAreaPagedDTO>(`${this.apiUrl}/paged`, {
      params,
      headers: this.authHeaders(),
    });
  }

  createSubArea(dto: SubAreaCreateDTO): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, {
      headers: this.authHeaders(),
    });
  }

  editSubArea(dto: SubAreaEditDTO): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, {
      headers: this.authHeaders(),
    });
  }

  deleteSubArea(subAreaId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${subAreaId}`, {
      headers: this.authHeaders(),
    });
  }

  /** Verifica si el área tiene scope configurado a nivel de área (sin subárea). */
  checkAreaScope(areaId: number): Observable<{ hasScope: boolean }> {
    return this.http.get<{ hasScope: boolean }>(`${this.apiUrl}/check-scope/${areaId}`, {
      headers: this.authHeaders(),
    });
  }
}
