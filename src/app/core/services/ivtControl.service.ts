import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';
import { IvtControlGetDTO } from "../dtos/ivtControl/ivtControlGet.model";
import { PagedResponseDTO } from "../dtos/api/pagedResponse.model";
import { IvtControlFiltersDTO } from "../dtos/ivtControl/ivtControlFilters.model";
import { SelectedFilters } from "../dtos/ivtControl/ivtControlSelectedFilters";

@Injectable({
  providedIn: 'root',
})
export class IvtControlService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ivtcontrolpdf`;

  constructor(private http: HttpClient) {}

  createIvtControl(formData: FormData): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getIvtControlPaged(filters:SelectedFilters): Observable<PagedResponseDTO<IvtControlGetDTO>> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      const typedKey = key as keyof SelectedFilters;

      const value = filters[typedKey];

      if (value !== null && value !== '' && value !== undefined && value !== 0) {
        params = params.set(key, value);
      }
    });
    return this.http.get<PagedResponseDTO<IvtControlGetDTO>>(`${this.apiUrl}/paged`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getFiltersData(): Observable<IvtControlFiltersDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<IvtControlFiltersDTO>(`${this.apiUrl}/get-filters-data`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
