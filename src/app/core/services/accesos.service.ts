import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface AccesoRol {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  esGlobal: boolean;
}

export interface AccesoAsignacion {
  id: number;
  rolId: number;
  rolNombre: string;
  proyectoId: number | null;
  proyectoNombre: string | null;
}

export interface AccesoUsuario {
  personaId: number;
  nombre: string;
  documento: string;
  emailLogin: string;
  estado: string;
  ultimoAcceso: string | null;
  asignaciones: AccesoAsignacion[];
}

export interface AccesosResponse {
  roles: AccesoRol[];
  usuarios: AccesoUsuario[];
}

/** Vista única de accesos: usuarios + roles + alcance. Dar y quitar roles usa PersonasService. */
@Injectable({ providedIn: 'root' })
export class AccesosService {
  private readonly url = `${environment.apiUrl}api/v1/accesos`;

  constructor(private http: HttpClient, private auth: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  get(): Observable<AccesosResponse> {
    return this.http.get<AccesosResponse>(this.url, { headers: this.headers() });
  }
}
