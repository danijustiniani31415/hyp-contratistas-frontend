import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { buildAuthHeaders } from '../../../salud-ocupacional/services/http-base';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { HorasHombreDashboardDto, HorasHombreDiaDto } from '../dtos/horas-hombre.model';

export interface HorasHombreFiltro {
  proyectoId?: number | null;
  empresaId?: number | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class HorasHombreService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma-horas-hombre`;

  constructor(private http: HttpClient) {}

  private buildParams(filtro: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filtro)) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  getTabla(filtro: HorasHombreFiltro): Observable<PagedResponseDTO<HorasHombreDiaDto>> {
    return this.http.get<PagedResponseDTO<HorasHombreDiaDto>>(`${this.base}/tabla`, {
      headers: buildAuthHeaders(),
      params: this.buildParams(filtro),
    });
  }

  getDashboard(proyectoId?: number | null, mes?: number | null, anio?: number | null): Observable<HorasHombreDashboardDto> {
    return this.http.get<HorasHombreDashboardDto>(`${this.base}/dashboard`, {
      headers: buildAuthHeaders(),
      params: this.buildParams({ proyectoId, mes, anio }),
    });
  }
}
