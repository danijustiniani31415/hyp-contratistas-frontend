import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PlaneamientoBimConfigDTO,
  PlaneamientoBimConfigUpdateDto,
  ResponsableBimWorkerDTO,
} from '../dtos/planeamiento-bim-config.dto';
import {
  CargaDiariaDto,
  CargaDiariaUpdateDto,
  EvidenciaFotoDto,
} from '../dtos/planeamiento-bim-carga-diaria.dto';
import {
  RestriccionCreateDto,
  RestriccionDto,
  RestriccionUpdateDto,
} from '../dtos/planeamiento-bim-restriccion.dto';
import {
  AvanceProyectoDto,
  CausasParetoDto,
  MetaSemanalDto,
  MetaSemanalUpdateDto,
  PlanMaestroSemanaDto,
  PpcHistoricoDto,
} from '../dtos/planeamiento-bim-dashboard.dto';
import {
  PortafolioKpisDto,
  ProyectoPortafolioDto,
} from '../dtos/planeamiento-bim-portafolio.dto';

@Injectable({
  providedIn: 'root',
})
export class PlaneamientoBimService {
  private readonly baseUrl = `${environment.apiUrl}api/v1/planeamiento-bim`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  // ── Configuración Inicial ────────────────────────────────────
  getConfiguracion(projectId: number): Observable<PlaneamientoBimConfigDTO> {
    return this.http.get<PlaneamientoBimConfigDTO>(`${this.baseUrl}/configuracion/${projectId}`, {
      headers: this.headers,
    });
  }

  getResponsables(): Observable<ResponsableBimWorkerDTO[]> {
    return this.http.get<ResponsableBimWorkerDTO[]>(`${this.baseUrl}/configuracion/responsables`, {
      headers: this.headers,
    });
  }

  saveConfiguracion(projectId: number, payload: PlaneamientoBimConfigUpdateDto): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/configuracion/${projectId}`, payload, {
      headers: this.headers,
    });
  }

  // ── Carga Diaria ─────────────────────────────────────────────
  getCargaDiaria(projectId: number, fecha: string, categoria: string = 'GENERAL'): Observable<CargaDiariaDto> {
    const params = new HttpParams().set('fecha', fecha).set('categoria', categoria);
    return this.http.get<CargaDiariaDto>(`${this.baseUrl}/carga-diaria/${projectId}`, {
      headers: this.headers,
      params,
    });
  }

  saveCargaDiaria(projectId: number, fecha: string, payload: CargaDiariaUpdateDto): Observable<any> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.put<any>(`${this.baseUrl}/carga-diaria/${projectId}`, payload, {
      headers: this.headers,
      params,
    });
  }

  subirEvidencias(
    projectId: number,
    fecha: string,
    files: File[],
    categoria: string = 'GENERAL',
  ): Observable<EvidenciaFotoDto[]> {
    const params = new HttpParams().set('fecha', fecha).set('categoria', categoria);
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    return this.http.post<EvidenciaFotoDto[]>(`${this.baseUrl}/carga-diaria/${projectId}/evidencias`, formData, {
      headers: this.headers,
      params,
    });
  }

  // ── Restricciones ────────────────────────────────────────────
  getRestricciones(projectId: number, soloActivos?: boolean): Observable<RestriccionDto[]> {
    let params = new HttpParams();
    if (soloActivos !== undefined && soloActivos !== null) {
      params = params.set('soloActivos', soloActivos.toString());
    }
    return this.http.get<RestriccionDto[]>(`${this.baseUrl}/restricciones/${projectId}`, {
      headers: this.headers,
      params,
    });
  }

  createRestriccion(projectId: number, payload: RestriccionCreateDto): Observable<RestriccionDto> {
    return this.http.post<RestriccionDto>(`${this.baseUrl}/restricciones/${projectId}`, payload, {
      headers: this.headers,
    });
  }

  updateRestriccion(id: number, payload: RestriccionUpdateDto): Observable<RestriccionDto> {
    return this.http.put<RestriccionDto>(`${this.baseUrl}/restricciones/${id}`, payload, {
      headers: this.headers,
    });
  }

  cerrarRestriccion(id: number): Observable<RestriccionDto> {
    return this.http.put<RestriccionDto>(`${this.baseUrl}/restricciones/${id}/cerrar`, {}, {
      headers: this.headers,
    });
  }

  // ── Dashboard de Proyecto ───────────────────────────────────
  getAvance(projectId: number, desde?: string | null, hasta?: string | null): Observable<AvanceProyectoDto> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<AvanceProyectoDto>(`${this.baseUrl}/dashboard/${projectId}/avance`, {
      headers: this.headers,
      params,
    });
  }

  getPpcHistorico(projectId: number, desde?: string | null, hasta?: string | null): Observable<PpcHistoricoDto> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<PpcHistoricoDto>(`${this.baseUrl}/dashboard/${projectId}/ppc`, {
      headers: this.headers,
      params,
    });
  }

  getMetasSemanales(projectId: number): Observable<MetaSemanalDto[]> {
    return this.http.get<MetaSemanalDto[]>(`${this.baseUrl}/dashboard/${projectId}/metas-semanales`, {
      headers: this.headers,
    });
  }

  guardarMetasSemanales(projectId: number, payload: MetaSemanalUpdateDto): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/dashboard/${projectId}/metas-semanales`, payload, {
      headers: this.headers,
    });
  }

  getPlanMaestro(projectId: number): Observable<PlanMaestroSemanaDto[]> {
    return this.http.get<PlanMaestroSemanaDto[]>(`${this.baseUrl}/dashboard/${projectId}/plan-maestro`, {
      headers: this.headers,
    });
  }

  getCausasPareto(projectId: number, desde?: string | null, hasta?: string | null): Observable<CausasParetoDto> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<CausasParetoDto>(`${this.baseUrl}/dashboard/${projectId}/causas-pareto`, {
      headers: this.headers,
      params,
    });
  }

  // ── Portafolio (landing, antes de elegir proyecto) ────────────
  getPortafolioKpis(): Observable<PortafolioKpisDto> {
    return this.http.get<PortafolioKpisDto>(`${this.baseUrl}/portafolio/kpis`, {
      headers: this.headers,
    });
  }

  getPortafolioProyectos(): Observable<ProyectoPortafolioDto[]> {
    return this.http.get<ProyectoPortafolioDto[]>(`${this.baseUrl}/portafolio/proyectos`, {
      headers: this.headers,
    });
  }

  exportarPdfProyecto(projectId: number, fecha: string): Observable<Blob> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.post(`${this.baseUrl}/portafolio/${projectId}/export-pdf`, null, {
      headers: this.headers,
      params,
      responseType: 'blob' as const,
    });
  }
}
