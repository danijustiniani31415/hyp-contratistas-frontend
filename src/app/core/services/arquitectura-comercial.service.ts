import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ArqComercialDashboardDTO,
  ArqComercialFiltersDTO,
  ArqComercialSelectedFilters,
  SupervisorHistoricoDTO,
} from '../dtos/arquitectura-comercial/arquitectura-comercial-dashboard.model';
import {
  DashboardFiltroDTO,
  ActividadAlertaDTO,
  EnviarAlertaRequestDTO,
} from '../dtos/arquitectura-comercial/arquitectura-comercial-alert.model';
import {
  ProyectoConActividadesDTO,
  SupervisorAcDTO,
  ActividadListItemDTO,
  ActividadListResponseDTO,
  ActividadesQueryParams,
  ActividadPatchBody,
  ReasignarEncargadoResultDTO,
  GenerarActividadesResultDTO,
  PatchProyectoBody,
  GanttActividadDTO,
  GanttQueryParams,
  PlantillaActividadDTO,
  CreatePlantillaBody,
  PatchPlantillaBody,
  AcCategoriaDTO,
  AcEspecialidadDTO,
  AcEtapaDTO,
  CreateActividadBody,
  UpdateActividadBody,
} from '../dtos/arquitectura-comercial/actividades.model';

@Injectable({ providedIn: 'root' })
export class ArquitecturaComercialService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/arquitectura-comercial`;

  constructor(private http: HttpClient) {}

  private authHeaders(): Record<string, string> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  getDashboardData(filters: ArqComercialSelectedFilters): Observable<ArqComercialDashboardDTO> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      const value = (filters as any)[key];
      if (value !== null && value !== '' && value !== undefined && value !== 0) {
        params = params.set(key, value);
      }
    });
    return this.http.get<ArqComercialDashboardDTO>(`${this.apiUrl}/dashboard`, {
      params,
      headers: this.authHeaders(),
    });
  }

  getFilters(): Observable<ArqComercialFiltersDTO> {
    return this.http.get<ArqComercialFiltersDTO>(`${this.apiUrl}/filters`, {
      headers: this.authHeaders(),
    });
  }

  getProyectosConActividades(): Observable<ProyectoConActividadesDTO[]> {
    return this.http.get<ProyectoConActividadesDTO[]>(`${this.apiUrl}/proyectos-con-actividades`, {
      headers: this.authHeaders(),
    });
  }

  getSupervisoresAc(soloObreros = false): Observable<SupervisorAcDTO[]> {
    let params = new HttpParams();
    if (soloObreros) params = params.set('soloObreros', true);
    return this.http.get<SupervisorAcDTO[]>(`${this.apiUrl}/supervisores-ac`, {
      headers: this.authHeaders(),
      params,
    });
  }

  getActividades(q: ActividadesQueryParams): Observable<ActividadListResponseDTO> {
    let params = new HttpParams();
    if (q.proyectoId != null) params = params.set('proyectoId', q.proyectoId);
    if (q.tipo) params = params.set('tipo', q.tipo);
    if (q.etapaId != null) params = params.set('etapaId', q.etapaId);
    if (q.search) params = params.set('search', q.search);
    if (q.soloActivas != null) params = params.set('soloActivas', q.soloActivas);
    if (q.filtroUserId != null) params = params.set('filtroUserId', q.filtroUserId);
    if (q.pagina != null) params = params.set('pagina', q.pagina);
    if (q.porPagina != null) params = params.set('porPagina', q.porPagina);
    return this.http.get<ActividadListResponseDTO>(`${this.apiUrl}/actividades`, {
      params,
      headers: this.authHeaders(),
    });
  }

  createActividad(body: CreateActividadBody): Observable<ActividadListItemDTO> {
    return this.http.post<ActividadListItemDTO>(`${this.apiUrl}/actividades`, body, {
      headers: this.authHeaders(),
    });
  }

  updateActividad(id: number, body: UpdateActividadBody): Observable<ActividadListItemDTO> {
    return this.http.put<ActividadListItemDTO>(`${this.apiUrl}/actividades/${id}`, body, {
      headers: this.authHeaders(),
    });
  }

  deleteActividad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/actividades/${id}`, {
      headers: this.authHeaders(),
    });
  }

  patchActividad(id: number, body: ActividadPatchBody): Observable<ActividadListItemDTO> {
    return this.http.patch<ActividadListItemDTO>(`${this.apiUrl}/actividades/${id}`, body, {
      headers: this.authHeaders(),
    });
  }

  reasignarEncargado(proyectoId: number): Observable<ReasignarEncargadoResultDTO> {
    return this.http.post<ReasignarEncargadoResultDTO>(
      `${this.apiUrl}/actividades/reasignar-encargado`,
      { proyectoId },
      { headers: this.authHeaders() },
    );
  }

  generarActividades(proyectoId: number): Observable<GenerarActividadesResultDTO> {
    return this.http.post<GenerarActividadesResultDTO>(
      `${this.apiUrl}/actividades/generar`,
      { proyectoId },
      { headers: this.authHeaders() },
    );
  }

  patchProyecto(id: number, body: PatchProyectoBody): Observable<ProyectoConActividadesDTO> {
    return this.http.patch<ProyectoConActividadesDTO>(`${this.apiUrl}/proyectos/${id}`, body, {
      headers: this.authHeaders(),
    });
  }

  getPlantilla(): Observable<PlantillaActividadDTO[]> {
    return this.http.get<PlantillaActividadDTO[]>(`${this.apiUrl}/plantilla`, {
      headers: this.authHeaders(),
    });
  }

  createPlantilla(body: CreatePlantillaBody): Observable<PlantillaActividadDTO> {
    return this.http.post<PlantillaActividadDTO>(`${this.apiUrl}/plantilla`, body, {
      headers: this.authHeaders(),
    });
  }

  patchPlantilla(id: number, body: PatchPlantillaBody): Observable<PlantillaActividadDTO> {
    return this.http.patch<PlantillaActividadDTO>(`${this.apiUrl}/plantilla/${id}`, body, {
      headers: this.authHeaders(),
    });
  }

  getCategorias(): Observable<AcCategoriaDTO[]> {
    return this.http.get<AcCategoriaDTO[]>(`${this.apiUrl}/categorias`, {
      headers: this.authHeaders(),
    });
  }

  getEspecialidades(): Observable<AcEspecialidadDTO[]> {
    return this.http.get<AcEspecialidadDTO[]>(`${this.apiUrl}/especialidades`, {
      headers: this.authHeaders(),
    });
  }

  getEtapas(): Observable<AcEtapaDTO[]> {
    return this.http.get<AcEtapaDTO[]>(`${this.apiUrl}/etapas`, {
      headers: this.authHeaders(),
    });
  }

  getGantt(q: GanttQueryParams): Observable<GanttActividadDTO[]> {
    let params = new HttpParams();
    if (q.proyectoId != null) params = params.set('proyectoId', q.proyectoId);
    if (q.tipo) params = params.set('tipo', q.tipo);
    if (q.etapa) params = params.set('etapa', q.etapa);
    if (q.soloActivas != null) params = params.set('soloActivas', q.soloActivas);
    if (q.filtroUserId != null) params = params.set('filtroUserId', q.filtroUserId);
    return this.http.get<GanttActividadDTO[]>(`${this.apiUrl}/gantt`, {
      params,
      headers: this.authHeaders(),
    });
  }

  getProyectos(): Observable<{ id: number; nombre: string }[]> {
    return this.http.get<{ id: number; nombre: string }[]>(`${this.apiUrl}/proyectos`, {
      headers: this.authHeaders(),
    });
  }

  getDashboardV2(filtro: DashboardFiltroDTO): Observable<ArqComercialDashboardDTO> {
    const params = this.buildParams(filtro);
    return this.http.get<ArqComercialDashboardDTO>(`${this.apiUrl}/dashboard-v2`, {
      params,
      headers: this.authHeaders(),
    });
  }

  getActividadesPorAlerta(
    tipoAlerta: string,
    filtro: DashboardFiltroDTO,
  ): Observable<ActividadAlertaDTO[]> {
    const params = this.buildParams(filtro);
    return this.http.get<ActividadAlertaDTO[]>(`${this.apiUrl}/alertas/${tipoAlerta}`, {
      params,
      headers: this.authHeaders(),
    });
  }

  enviarAlertasActividades(req: EnviarAlertaRequestDTO): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/alertas/enviar`, req, {
      headers: this.authHeaders(),
    });
  }

  getSupervisorHistorico(userId: number): Observable<SupervisorHistoricoDTO> {
    return this.http.get<SupervisorHistoricoDTO>(`${this.apiUrl}/dashboard/supervisor/${userId}/historico`, {
      headers: this.authHeaders(),
    });
  }

  private buildParams(filtro: DashboardFiltroDTO): Record<string, string> {
    const p: Record<string, string> = {};
    if (filtro.categoriaId != null) p['categoriaId'] = String(filtro.categoriaId);
    if (filtro.proyectoId  != null) p['proyectoId']  = String(filtro.proyectoId);
    if (filtro.userId      != null) p['userId']      = String(filtro.userId);
    if (filtro.semana      != null) p['semana']      = String(filtro.semana);
    if (filtro.mes         != null) p['mes']         = String(filtro.mes);
    if (filtro.anio        != null) p['anio']        = String(filtro.anio);
    return p;
  }
}
