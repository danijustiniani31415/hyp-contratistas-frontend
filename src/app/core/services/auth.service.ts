import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginRequestDTO } from '../dtos/auth/login-request.model';
import { LoginResponseDTO, RefreshResponseDTO } from '../dtos/auth/login-response.model';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';
import { ContratistaTokenDto, EmpresaSimpleDto } from '../../features/habilitacion/dtos/empresa.model';
import { ClinicaTokenDto } from '../dtos/auth/clinica-token.model';
import { Roles } from '../constants/roles';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/auth`;
  private readonly habAuthUrl = `${environment.apiUrl}api/v1/habilitacion/auth`;

  constructor(private http: HttpClient) {}

  loginClinica(email: string, password: string): Observable<ClinicaTokenDto> {
    return this.http.post<ClinicaTokenDto>(
      `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/auth/login`,
      { email, password },
    );
  }

  /**
   * Limpia toda llave de sesión previa antes de persistir un login nuevo.
   * Evita que datos de un tipo de sesión (CONTRATISTA, staff) se queden
   * pegados en localStorage y contaminen el guard de otro tipo de sesión
   * (p. ej. allowed_features de un login anterior "autorizando" rutas que
   * no le corresponden al usuario actual).
   */
  private limpiarSesionAnterior(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('session_token');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('user');
    localStorage.removeItem('allowed_features');
    localStorage.removeItem('contratista_scope');
    localStorage.removeItem('contratista_proyectos');
    localStorage.removeItem('contratista_modulos');
  }

  persistClinicaToken(data: ClinicaTokenDto): void {
    this.limpiarSesionAnterior();
    localStorage.setItem('access_token', data.token);
    localStorage.setItem(
      'user',
      JSON.stringify({ clinicaId: data.clinicaId, nombre: data.nombre, tipo: data.tipo }),
    );
  }

  loginContratista(email: string, password: string): Observable<ContratistaTokenDto> {
    return this.http
      .post<ContratistaTokenDto>(`${this.habAuthUrl}/login`, { email, password })
      .pipe(tap((res) => this.persistContratistaToken(res)));
  }

  activarCuenta(dto: { token: string; password: string }): Observable<ContratistaTokenDto> {
    return this.http
      .post<ContratistaTokenDto>(`${this.habAuthUrl}/activar`, dto)
      .pipe(tap((res) => this.persistContratistaToken(res)));
  }

  resetPassword(dto: { token: string; nuevaPassword: string }): Observable<void> {
    return this.http.post<void>(`${this.habAuthUrl}/reset-password`, dto);
  }

  solicitarReset(email: string): Observable<void> {
    return this.http.post<void>(`${this.habAuthUrl}/solicitar-reset`, { email });
  }

  getEmpresasContratistas(): Observable<EmpresaSimpleDto[]> {
    return this.http.get<EmpresaSimpleDto[]>(`${this.habAuthUrl}/empresas`);
  }

  private persistContratistaToken(res: ContratistaTokenDto): void {
    this.limpiarSesionAnterior();
    localStorage.setItem('access_token', res.token);
    localStorage.setItem(
      'user',
      JSON.stringify({
        empresaId: res.empresaId,
        razonSocial: res.razonSocial,
        tipo: res.tipo,
      }),
    );
    localStorage.setItem('allowed_features', JSON.stringify(res.allowedFeatures ?? []));
    localStorage.setItem('contratista_scope', res.scope ?? 'TODOS');
    localStorage.setItem('contratista_proyectos', JSON.stringify(res.proyectoIds ?? []));
    localStorage.setItem('contratista_modulos', (res.modulos ?? 'AMBOS').toUpperCase());
  }

  getContratistaScope(): string {
    return localStorage.getItem('contratista_scope') ?? 'TODOS';
  }

  getContratistaModulos(): string {
    return localStorage.getItem('contratista_modulos') ?? 'AMBOS';
  }

  getContratistaProyectoIds(): number[] {
    try {
      return JSON.parse(localStorage.getItem('contratista_proyectos') ?? '[]');
    } catch { return []; }
  }

  setPassword(data: { token: string; password: string | null | undefined }) {
    return this.http.post(`${this.apiUrl}/set-password`, data);
  }

  forgotPassword(userId: number) {
    return this.http.post(`${this.apiUrl}/forgot-password`, { userId });
  }

  login(data: LoginRequestDTO) {
    return this.http.post<LoginResponseDTO>(`${this.apiUrl}/login`, data).pipe(
      tap((res) => {
        this.limpiarSesionAnterior();
        localStorage.setItem('access_token', res.accessToken);
        if (res.sessionToken) localStorage.setItem('session_token', res.sessionToken);
        if (res.expiresAt) localStorage.setItem('token_expires_at', res.expiresAt);
        if (res.user) localStorage.setItem('user', JSON.stringify(res.user));
        if (res.allowedFeatures) {
          localStorage.setItem('allowed_features', JSON.stringify(res.allowedFeatures));
        }
      }),
    );
  }

  /**
   * Refresca el access token (JWT de vida corta) usando el session token de larga
   * vida. El backend regenera el JWT y las features con los datos ACTUALES de BD,
   * por lo que cambios de rol se reflejan sin re-loguear.
   */
  refresh(): Observable<RefreshResponseDTO> {
    const sessionToken =
      typeof localStorage !== 'undefined' ? localStorage.getItem('session_token') : null;
    return this.http
      .post<RefreshResponseDTO>(`${this.apiUrl}/refresh`, { sessionToken })
      .pipe(
        tap((res) => {
          localStorage.setItem('access_token', res.accessToken);
          if (res.allowedFeatures) {
            localStorage.setItem('allowed_features', JSON.stringify(res.allowedFeatures));
          }
        }),
      );
  }

  getSessionToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('session_token');
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('session_token');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('user');
    localStorage.removeItem('allowed_features');
  }

  isTokenExpired(): boolean {
    if (typeof localStorage === 'undefined') return true;
    const token = localStorage.getItem('access_token');
    if (!token) return true;

    try {
      const decoded: any = jwtDecode(token);
      const exp = decoded.exp * 1000;
      return Date.now() > exp;
    } catch {
      return true;
    }
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  getCurrentUserId(): number {
    const token = this.getToken();
    if (!token) return 0;
    try {
      const decoded: any = jwtDecode(token);
      const raw =
        decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ??
        decoded.nameid ??
        decoded.sub;
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Devuelve los IDs de rol del usuario, como strings. El backend emite el ID (no el
   * nombre) en el role claim del JWT, que jwt-decode expone bajo la URI de Microsoft.
   * Se usan IDs para no depender del texto del rol (que puede editarse). Emparejar
   * contra las constantes de `core/constants/roles.ts`.
   *
   * El backend guarda el nombre aparte, en el claim `role_name`, solo para mostrar.
   * Las sesiones de CONTRATISTA/CLINICA traen su ID de rol igual, pero para "¿es
   * contratista/clínica?" preferir `isContratista()` / `isClinica()` (claim `tipo`).
   */
  getRoles(): string[] {
    const token = this.getToken();
    if (!token) return [];

    const decoded: any = jwtDecode(token);

    let roles =
      decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? decoded.role;

    if (roles === undefined || roles === null) return [];

    return (Array.isArray(roles) ? roles : [roles]).map((r) => String(r));
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  /**
   * Acceso dinámico por featureKey (espejo de `roleGuard`): revisa `allowed_features`
   * (lista que el backend arma desde role_feature de los roles del usuario). Sirve para
   * mostrar/ocultar controles de una feature sin hardcodear roles. Nota: `allowed_features`
   * se refresca al iniciar sesión o al renovar el token, así que un rol recién asignado a
   * la feature aplica tras re-loguear/refrescar.
   */
  hasFeature(featureKey: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem('allowed_features');
    const features: string[] = raw ? JSON.parse(raw) : [];
    return features.includes(featureKey);
  }

  isContratista(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      return user.tipo === 'CONTRATISTA';
    } catch {
      return false;
    }
  }

  isClinica(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      return user.tipo === 'CLINICA';
    } catch {
      return false;
    }
  }

  getEmpresaId(): number | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      return user.empresaId ?? null;
    } catch {
      return null;
    }
  }

  /** Correo del usuario logueado (lo guarda el login de Microsoft en `user.email`). */
  getUserEmail(): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      return user.email ?? null;
    } catch {
      return null;
    }
  }

  /** Nombre del usuario logueado — `fullName` en login interno, `displayName` en login de Microsoft. */
  getUserName(): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      return user.fullName ?? user.displayName ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Trabajador de Abril que ve el boletín "Vive Abril": entra por el login de
   * Microsoft (correo `@abril.pe`) y tiene el rol `USUARIO DE ABRIL`. Se usa para
   * redirigir al boletín tras iniciar sesión y para proteger la ruta `/boletin`.
   */
  esUsuarioAbrilBoletin(): boolean {
    const email = (this.getUserEmail() ?? '').toLowerCase();
    return email.endsWith('@abril.pe') && this.hasRole(Roles.USUARIO_DE_ABRIL);
  }
}
