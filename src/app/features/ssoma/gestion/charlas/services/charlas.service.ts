import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  ProyectoInfo, Staff, CharlaResumen, AsistenciaDetail, Capacitacion, Resumen,
  CrearCharlaDto, GuardarAsistenciaDto, EditarCharlaDto,
  DashSupervisoresRow, ComparativoMes, NuevaCharlaCreateDto,
  CharlaListResult, CharlaDetalle, UsuarioDto, CharlaGaleriaItem,
  DashPersonalResult, DashProyectoItem,
} from '../dtos/charlas.dtos';

@Injectable({ providedIn: 'root' })
export class CharlasService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma-charlas`;

  /**
   * Último proyecto elegido en el Dashboard de Charlas (tab 1), en memoria mientras dura la
   * sesión de navegación. Cada pestaña de "Charlas y Capacitaciones" es una ruta distinta que
   * recrea el componente desde cero, así que sin esto cada cambio de pestaña repetía la búsqueda
   * completa de "primer proyecto con datos" (varias llamadas HTTP secuenciales, ~3s) perdiendo
   * el proyecto que el usuario ya tenía seleccionado.
   */
  ultimoProyectoId: number | undefined;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getUserId(): number {
    return this.auth.getCurrentUserId();
  }

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // ── Proyectos / Staff ────────────────────────────────────────────────────────
  getTodosProyectos(): Observable<ProyectoInfo[]> {
    return this.http.get<ProyectoInfo[]>(`${this.base}/proyectos`, { headers: this.authHeaders() });
  }

  getMiProyecto(): Observable<ProyectoInfo | null> {
    return this.http.get<ProyectoInfo | null>(`${this.base}/mi-proyecto?userId=${this.getUserId()}`, {
      headers: this.authHeaders(),
    });
  }

  getStaff(proyectoId: number): Observable<Staff[]> {
    return this.http.get<Staff[]>(`${this.base}/staff?proyectoId=${proyectoId}`, {
      headers: this.authHeaders(),
    });
  }

  getResumen(proyectoId: number, mes: number, anio: number): Observable<Resumen> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('mes', mes).set('anio', anio);
    return this.http.get<Resumen>(`${this.base}/resumen`, { params, headers: this.authHeaders() });
  }

  // ── Old Tab 1: Asistencia (kept for compatibility) ──────────────────────────
  getCharlas(proyectoId: number, mes: number, anio: number): Observable<CharlaResumen[]> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('mes', mes).set('anio', anio);
    return this.http.get<CharlaResumen[]>(`${this.base}/charlas`, { params, headers: this.authHeaders() });
  }

  crearCharla(dto: CrearCharlaDto): Observable<CharlaResumen> {
    return this.http.post<CharlaResumen>(`${this.base}/charlas?userId=${this.getUserId()}`, dto, {
      headers: this.authHeaders(),
    });
  }

  eliminarCharla(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/charlas/${id}`, { headers: this.authHeaders() });
  }

  getAsistencia(charlaId: number): Observable<AsistenciaDetail[]> {
    return this.http.get<AsistenciaDetail[]>(`${this.base}/charlas/${charlaId}/asistencia`, {
      headers: this.authHeaders(),
    });
  }

  guardarAsistencia(charlaId: number, dto: GuardarAsistenciaDto): Observable<void> {
    return this.http.post<void>(
      `${this.base}/charlas/${charlaId}/asistencia?userId=${this.getUserId()}`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  // ── Old Tab 2: Capacitaciones ────────────────────────────────────────────────
  getCapacitaciones(proyectoId: number, mes?: number, anio?: number): Observable<Capacitacion[]> {
    let params = new HttpParams().set('proyectoId', proyectoId);
    if (mes && mes > 0) params = params.set('mes', mes);
    if (anio && anio > 0) params = params.set('anio', anio);
    return this.http.get<Capacitacion[]>(`${this.base}/capacitaciones`, {
      params,
      headers: this.authHeaders(),
    });
  }

  getMisCapacitaciones(): Observable<Capacitacion[]> {
    return this.http.get<Capacitacion[]>(`${this.base}/capacitaciones/mis?userId=${this.getUserId()}`, {
      headers: this.authHeaders(),
    });
  }

  subirCapacitacion(fecha: string, tema: string, file: File): Observable<Capacitacion> {
    const userId = this.getUserId();
    const formData = new FormData();
    formData.append('fecha', fecha);
    formData.append('tema', tema);
    formData.append('file', file);
    return this.http.post<Capacitacion>(`${this.base}/capacitaciones/mi-evidencia?userId=${userId}`, formData, {
      headers: this.authHeaders(),
    });
  }

  subirCapacitacionMulti(fecha: string, tema: string, files: File[]): Observable<Capacitacion> {
    const userId = this.getUserId();
    const formData = new FormData();
    formData.append('fecha', fecha);
    formData.append('tema', tema);
    files.forEach(f => formData.append('files', f, f.name));
    return this.http.post<Capacitacion>(
      `${this.base}/capacitaciones/mi-evidencia-multi?userId=${userId}`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  cambiarEstado(id: number, estado: string): Observable<Capacitacion> {
    return this.http.put<Capacitacion>(
      `${this.base}/capacitaciones/${id}/estado?userId=${this.getUserId()}`,
      { estado },
      { headers: this.authHeaders() },
    );
  }

  eliminarCapacitacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/capacitaciones/${id}`, { headers: this.authHeaders() });
  }

  // ── NEW: Tab 1 — Dashboard Asistencia Supervisores ──────────────────────────
  getDashboardSupervisores(proyectoId: number, mes: number, anio: number): Observable<DashSupervisoresRow[]> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('mes', mes).set('anio', anio);
    return this.http.get<DashSupervisoresRow[]>(`${this.base}/dashboard-supervisores`, {
      params,
      headers: this.authHeaders(),
    });
  }

  // ── NEW: Tab 2 — Comparativo ─────────────────────────────────────────────────
  getComparativo(proyectoId: number, anio: number): Observable<ComparativoMes[]> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('anio', anio);
    return this.http.get<ComparativoMes[]>(`${this.base}/comparativo`, {
      params,
      headers: this.authHeaders(),
    });
  }

  // ── NEW: Tab 3 — Crear nueva charla ─────────────────────────────────────────
  crearNuevaCharla(dto: NuevaCharlaCreateDto): Observable<any> {
    return this.http.post<any>(`${this.base}/nueva?userId=${this.getUserId()}`, dto, {
      headers: this.authHeaders(),
    });
  }

  /** Guarda de una sola vez la cabecera (título, tipo y fecha) y la asistencia de la charla. */
  editarCharla(charlaId: number, dto: EditarCharlaDto): Observable<void> {
    return this.http.put<void>(`${this.base}/charlas/${charlaId}?userId=${this.getUserId()}`, dto, {
      headers: this.authHeaders(),
    });
  }

  getCharlasProyecto(proyectoId: number, mes: number, anio: number): Observable<CharlaGaleriaItem[]> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('mes', mes).set('anio', anio);
    return this.http.get<CharlaGaleriaItem[]>(`${this.base}/charlas-proyecto`, {
      params,
      headers: this.authHeaders(),
    });
  }

  // ── NEW: Tab 4 — Evidencia / Aprobación ─────────────────────────────────────
  getLista(proyectoId?: number, estado?: string, page = 1, pageSize = 20): Observable<CharlaListResult> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (proyectoId) params = params.set('proyectoId', proyectoId);
    if (estado) params = params.set('estado', estado);
    return this.http.get<CharlaListResult>(`${this.base}/lista`, { params, headers: this.authHeaders() });
  }

  getDetalle(id: number): Observable<CharlaDetalle> {
    return this.http.get<CharlaDetalle>(`${this.base}/${id}/detalle`, { headers: this.authHeaders() });
  }

  aprobar(id: number): Observable<any> {
    return this.http.put<any>(
      `${this.base}/${id}/aprobar?userId=${this.getUserId()}`,
      {},
      { headers: this.authHeaders() },
    );
  }

  rechazar(id: number, motivo: string): Observable<any> {
    return this.http.put<any>(
      `${this.base}/${id}/rechazar?userId=${this.getUserId()}`,
      { motivo },
      { headers: this.authHeaders() },
    );
  }

  // ── NEW: Dashboard por persona y por proyecto ────────────────────────────────
  getDashPersonal(proyectoId: number, mes: number, anio: number): Observable<DashPersonalResult> {
    const params = new HttpParams().set('proyectoId', proyectoId).set('mes', mes).set('anio', anio);
    return this.http.get<DashPersonalResult>(`${this.base}/dashboard-personal`, {
      params,
      headers: this.authHeaders(),
    });
  }

  getDashProyectos(mes: number, anio: number): Observable<DashProyectoItem[]> {
    const params = new HttpParams().set('mes', mes).set('anio', anio);
    return this.http.get<DashProyectoItem[]>(`${this.base}/dashboard-proyectos`, {
      params,
      headers: this.authHeaders(),
    });
  }

  // ── NEW: Supervisor (app_user) search ────────────────────────────────────────
  getSupervisores(search?: string): Observable<UsuarioDto[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<UsuarioDto[]>(`${this.base}/supervisores`, { params, headers: this.authHeaders() });
  }
}
