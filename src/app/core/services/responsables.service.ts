import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';
import { ResponsablesDTO, ResponsableProyectoUpdateDTO } from '../dtos/habilitacion/responsables.model';

@Injectable({
  providedIn: 'root',
})
export class ResponsablesService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/habilitacion/responsables`;

  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  getAll(): Observable<ResponsablesDTO> {
    return this.http.get<ResponsablesDTO>(this.apiUrl, this.authHeaders());
  }

  updateRazonSocial(contributorId: number, emailAdministrador: string | null): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(
      `${this.apiUrl}/razones-sociales/${contributorId}`,
      { emailAdministrador },
      this.authHeaders(),
    );
  }

  updateProyecto(projectId: number, dto: ResponsableProyectoUpdateDTO): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(
      `${this.apiUrl}/proyectos/${projectId}`,
      dto,
      this.authHeaders(),
    );
  }
}
