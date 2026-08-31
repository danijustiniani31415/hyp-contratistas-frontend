import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import {
  HolidayDto,
  HolidayCreateDto,
  HolidayEditDto,
  HolidayInitialDto,
} from '../dtos/holiday.model';

@Injectable({ providedIn: 'root' })
export class HolidayService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/holiday`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { Authorization: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Carga inicial: tipos (desplegables) + primera página de la tabla en una sola petición. */
  getInitial(page: number = 1, pageSize: number = 10): Observable<HolidayInitialDto> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<HolidayInitialDto>(`${this.apiUrl}/initial`, {
      params,
      headers: this.authHeaders(),
    });
  }

  /** Solo la tabla paginada (cambios de página). */
  getPaged(page: number, pageSize: number = 10): Observable<PagedResponseDTO<HolidayDto>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PagedResponseDTO<HolidayDto>>(`${this.apiUrl}/paged`, {
      params,
      headers: this.authHeaders(),
    });
  }

  create(dto: HolidayCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.authHeaders() });
  }

  update(dto: HolidayEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, { headers: this.authHeaders() });
  }

  delete(holidayId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${holidayId}`, {
      headers: this.authHeaders(),
    });
  }
}
