import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectSimpleDTO } from "../dtos/project/projectSimple.model";

@Injectable({
  providedIn: 'root',
})
export class ProjectResidentService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/projectResident`;

  constructor(private http: HttpClient) {}

  getWithResidentByUserId(): Observable<ProjectSimpleDTO[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectSimpleDTO[]>(`${this.apiUrl}/with-resident-by-userId`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getProjectsDescription(): Observable<ProjectSimpleDTO[]> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ProjectSimpleDTO[]>(`${this.apiUrl}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}