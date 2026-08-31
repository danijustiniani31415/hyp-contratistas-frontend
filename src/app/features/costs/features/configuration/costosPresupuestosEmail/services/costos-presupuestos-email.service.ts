import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { CostosPresupuestosEmailDto } from '../dtos/costos-presupuestos-email.dto';
import { CostosPresupuestosEmailCreateDto } from '../dtos/costos-presupuestos-email-create.dto';
import { CostosPresupuestosEmailEditDto } from '../dtos/costos-presupuestos-email-edit.dto';
import { CostosPresupuestosEmailFilterDto } from '../dtos/costos-presupuestos-email-filter.dto';

@Injectable({ providedIn: 'root' })
export class CostosPresupuestosEmailService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/CostosPresupuestosEmail`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  }

  getPaged(
    filters: CostosPresupuestosEmailFilterDto,
  ): Observable<PagedResponseDTO<CostosPresupuestosEmailDto>> {
    let params = new HttpParams().set('page', filters.page.toString());
    if (filters.email) params = params.set('email', filters.email);

    return this.http.get<PagedResponseDTO<CostosPresupuestosEmailDto>>(`${this.apiUrl}/paged`, {
      headers: this.headers,
      params,
    });
  }

  create(dto: CostosPresupuestosEmailCreateDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  edit(dto: CostosPresupuestosEmailEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  delete(id: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${id}`, { headers: this.headers });
  }
}
