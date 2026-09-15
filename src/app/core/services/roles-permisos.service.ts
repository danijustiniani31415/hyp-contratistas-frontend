import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface RolListItem {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  esGlobal: boolean;
  cantidadPermisos: number;
}

export interface Permiso {
  id: number;
  codigo: string;
  descripcion: string | null;
  modulo: string;
}

export interface RolDetalle {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  esGlobal: boolean;
  permisoIds: number[];
}

@Injectable({ providedIn: 'root' })
export class RolesPermisosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/roles`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  listRoles(): Observable<RolListItem[]> {
    return this.http.get<RolListItem[]>(this.apiUrl, { headers: this.headers() });
  }

  listPermisos(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.apiUrl}/permisos`, { headers: this.headers() });
  }

  getRolDetalle(rolId: number): Observable<RolDetalle> {
    return this.http.get<RolDetalle>(`${this.apiUrl}/${rolId}`, { headers: this.headers() });
  }

  actualizarPermisos(rolId: number, permisoIds: number[]): Observable<RolDetalle> {
    return this.http.put<RolDetalle>(`${this.apiUrl}/${rolId}/permisos`, { permisoIds }, { headers: this.headers() });
  }
}
