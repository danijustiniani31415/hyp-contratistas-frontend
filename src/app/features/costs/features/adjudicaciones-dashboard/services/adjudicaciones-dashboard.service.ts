import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { AdjudicacionesDashboardDTO, AdjDashboardFilterValues } from '../dtos/adjudicaciones-dashboard.dto';

@Injectable({ providedIn: 'root' })
export class AdjudicacionesDashboardService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/projectSubContractor`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { [header: string]: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Trae los datos del dashboard aplicando los filtros indicados.
   * @param filters Valores seleccionados (null = sin filtrar).
   * @param includeFilters Solo true en la primera carga para traer los catálogos de filtros.
   */
  getDashboard(
    filters?: AdjDashboardFilterValues | null,
    includeFilters = true,
  ): Observable<AdjudicacionesDashboardDTO> {
    let params = new HttpParams().set('includeFilters', includeFilters);

    if (filters) {
      const entries: [string, number | null][] = [
        ['projectId', filters.projectId],
        ['contractTypeId', filters.contractTypeId],
        ['contractModalityId', filters.contractModalityId],
        ['paymentMethodId', filters.paymentMethodId],
        ['projectSubContractorStatusId', filters.projectSubContractorStatusId],
      ];
      for (const [key, value] of entries) {
        if (value !== null && value !== undefined) params = params.set(key, value);
      }
    }

    return this.http.get<AdjudicacionesDashboardDTO>(`${this.apiUrl}/dashboard`, {
      headers: this.authHeaders(),
      params,
    });
  }
}
