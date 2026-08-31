import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';
import { ConstructionLogbookControlGetDTO } from "../dtos/constructionLogbookControl/constructionLogbookControlGet.model";
import { PagedResponseDTO } from "../dtos/api/pagedResponse.model";
import { ConstructionLogbookControlFiltersDTO } from "../dtos/constructionLogbookControl/constructionLogbookControlFilters.model";
import { SelectedFilters } from "../dtos/constructionLogbookControl/constructionLogbookSelectedFilters";

@Injectable({
  providedIn: 'root',
})
export class ConstructionLogbookControlService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ConstructionSiteLogbookControl`;

  constructor(private http: HttpClient) {}

  createConstructionLogbookControl(formData: FormData): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getConstructionLogbookControlPaged(filters:SelectedFilters): Observable<PagedResponseDTO<ConstructionLogbookControlGetDTO>> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      const typedKey = key as keyof SelectedFilters;

      const value = filters[typedKey];

      if (value !== null && value !== '' && value !== undefined && value !== 0) {
        params = params.set(key, value);
      }
    });
    return this.http.get<PagedResponseDTO<ConstructionLogbookControlGetDTO>>(`${this.apiUrl}/paged`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getFiltersData(): Observable<ConstructionLogbookControlFiltersDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ConstructionLogbookControlFiltersDTO>(`${this.apiUrl}/get-filters-data`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
