import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AreaPagedDTO } from '../dtos/areaPaged.model';
import { AreaCreateDTO } from '../dtos/areaCreate.model';
import { AreaEditDTO } from '../dtos/areaEdit.model';
import { AreaSimpleDTO } from '../dtos/areaSimple.model';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';

@Injectable({
  providedIn: 'root',
})
export class AreaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/area`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getAreaPaged(page: number): Observable<AreaPagedDTO> {
    return this.http.get<AreaPagedDTO>(`${this.apiUrl}/paged?page=${page}`, {
      headers: this.authHeaders(),
    });
  }

  createArea(dto: AreaCreateDTO): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, {
      headers: this.authHeaders(),
    });
  }

  editArea(dto: AreaEditDTO): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, {
      headers: this.authHeaders(),
    });
  }

  deleteArea(areaId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${areaId}`, {
      headers: this.authHeaders(),
    });
  }

  getAreaSimple(): Observable<AreaSimpleDTO[]> {
    return this.http.get<AreaSimpleDTO[]>(`${this.apiUrl}/simple`, {
      headers: this.authHeaders(),
    });
  }
}
