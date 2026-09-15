import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

export interface LbAsignacion {
  rolCodigo: string;
  esGlobal: boolean;
  proyectoId: number | null;
  almacenId: number | null;
}

export interface LbLoginResponse {
  token: string;
  usuarioSistemaId: number;
  nombreCompleto: string;
  email: string;
  asignaciones: LbAsignacion[];
  permisos: string[];
}

/**
 * Sesión de HP Constructores / Las Bravas — independiente de AuthService (ese sigue siendo
 * el login legacy de Abril: contratista/clínica/boletín, con roles por ID de Abril). Usa sus
 * propias llaves de localStorage (prefijo lb_) para no pisar ni leer nada de una sesión de
 * Abril que pudiera quedar en el mismo navegador.
 */
@Injectable({ providedIn: 'root' })
export class LbAuthService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/lb-auth`;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LbLoginResponse> {
    return this.http.post<LbLoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => this.persistSesion(res)),
    );
  }

  private persistSesion(res: LbLoginResponse): void {
    localStorage.setItem('lb_token', res.token);
    localStorage.setItem('lb_user', JSON.stringify({
      usuarioSistemaId: res.usuarioSistemaId,
      nombreCompleto: res.nombreCompleto,
      email: res.email,
    }));
    localStorage.setItem('lb_asignaciones', JSON.stringify(res.asignaciones));
    localStorage.setItem('lb_permisos', JSON.stringify(res.permisos));
  }

  logout(): void {
    localStorage.removeItem('lb_token');
    localStorage.removeItem('lb_user');
    localStorage.removeItem('lb_asignaciones');
    localStorage.removeItem('lb_permisos');
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('lb_token');
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    try {
      const decoded: any = jwtDecode(token);
      return Date.now() > decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  getUser(): { usuarioSistemaId: number; nombreCompleto: string; email: string } | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      return JSON.parse(localStorage.getItem('lb_user') ?? 'null');
    } catch {
      return null;
    }
  }

  getAsignaciones(): LbAsignacion[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('lb_asignaciones') ?? '[]');
    } catch {
      return [];
    }
  }

  getPermisos(): string[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('lb_permisos') ?? '[]');
    } catch {
      return [];
    }
  }

  hasPermiso(codigo: string): boolean {
    return this.getPermisos().includes(codigo);
  }

  /** true si tiene una asignación vigente con ese rol (global, o con el scope indicado). */
  hasRol(rolCodigo: string, proyectoId?: number): boolean {
    return this.getAsignaciones().some((a) =>
      a.rolCodigo === rolCodigo && (a.esGlobal || proyectoId === undefined || a.proyectoId === proyectoId),
    );
  }
}
