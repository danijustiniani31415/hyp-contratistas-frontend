import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessageDTO } from '../dtos/api/ApiMessage.model';
import { ProjectPagedDTO } from '../dtos/project/projectPaged.model';
import { ProjectCreateDTO } from '../dtos/project/projectCreate.model';
import { ProjectEditDTO } from '../dtos/project/projectEdit.model';
import {
  ProjectEmailsDTO,
  ProjectEmailsResponseDTO,
} from '../dtos/project/projectEmails.model';
import { ProjectQueryParams } from '../dtos/project/projectQuery.model';
import { ProjectScheduleSimpleDTO } from '../dtos/project/projectScheduleSimple.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/project`;

  constructor(private http: HttpClient) {}

  getProjectPaged(page: number): Observable<ProjectPagedDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectPagedDTO>(`${this.apiUrl}/paged?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getProjectsPaged(query: ProjectQueryParams = {}): Observable<ProjectPagedDTO> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ProjectPagedDTO>(`${this.apiUrl}/paged`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
  }

  getWithResidentByUserId(): Observable<ProjectScheduleSimpleDTO[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectScheduleSimpleDTO[]>(`${this.apiUrl}/with-resident-by-userId`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  createProject(dto: ProjectCreateDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  editProject(dto: ProjectEditDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  deleteProject(projectId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /** Valores actuales + los trabajadores elegibles como residente, en una sola petición. */
  getProjectEmails(projectId: number): Observable<ProjectEmailsResponseDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectEmailsResponseDTO>(`${this.apiUrl}/${projectId}/emails`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  patchProjectEmails(projectId: number, dto: ProjectEmailsDTO): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(`${this.apiUrl}/${projectId}/emails`, dto, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /** IDs de proyecto asignados al usuario logueado (tabla user_project) — para preseleccionar
   * el proyecto "actual" en dashboards que hoy arrancan sin nada elegido. */
  getMisProyectos(): Observable<number[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<number[]>(`${this.apiUrl}/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /** Activa/desactiva rápido si el proyecto aparece en los selectores de Arquitectura Comercial. */
  toggleArquitecturaComercial(projectId: number): Observable<{ tieneArquitecturaComercial: boolean }> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<{ tieneArquitecturaComercial: boolean }>(
      `${this.apiUrl}/${projectId}/arquitectura-comercial`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

}
