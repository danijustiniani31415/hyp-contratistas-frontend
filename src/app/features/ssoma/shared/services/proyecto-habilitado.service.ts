import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProyectoHabilitadoListDTO, ProyectoSsomaSimpleDTO } from '../dtos/proyecto-habilitado.dtos';

@Injectable({ providedIn: 'root' })
export class ProyectoHabilitadoService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/proyectos`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  getTodos(): Observable<ProyectoHabilitadoListDTO[]> {
    return this.http.get<ProyectoHabilitadoListDTO[]>(this.base, { headers: this.authHeaders() });
  }

  getHabilitados(): Observable<ProyectoSsomaSimpleDTO[]> {
    return this.http.get<ProyectoSsomaSimpleDTO[]>(`${this.base}/habilitados`, {
      headers: this.authHeaders(),
    });
  }

  setHabilitado(proyectoId: number, habilitado: boolean): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${proyectoId}`,
      { habilitado },
      { headers: this.authHeaders() },
    );
  }
}
