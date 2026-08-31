import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  ProyectoAsignadoDto,
  SupervisorAsignacionDto,
  UpdateAsignacionDto,
} from '../dtos/ev-asignaciones.model';

@Injectable({ providedIn: 'root' })
export class EvAsignacionesService {
  private base = `${environment.apiUrl}api/v1/evaluaciones/asignaciones-supervisor`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getSupervisores(): Observable<SupervisorAsignacionDto[]> {
    return this.http.get<SupervisorAsignacionDto[]>(this.base, { headers: this.headers() });
  }

  getProyectos(): Observable<ProyectoAsignadoDto[]> {
    return this.http.get<ProyectoAsignadoDto[]>(`${this.base}/proyectos`, {
      headers: this.headers(),
    });
  }

  updateAsignaciones(supervisorWorkerId: number, dto: UpdateAsignacionDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${supervisorWorkerId}`, dto, {
      headers: this.headers(),
    });
  }
}
