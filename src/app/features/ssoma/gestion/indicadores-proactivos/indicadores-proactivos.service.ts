import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  InspeccionTipoDto,
  ProgInspeccionResumenDto,
  GuardarProgInspeccionRequest,
  IndicadorProactivoProyectoDto,
  IndicadorReactivoProyectoDto,
  PuntajeMesDto,
  MetaAnualDto,
  GuardarMetaAnualRequest,
} from './indicadores-proactivos.dtos';

@Injectable({ providedIn: 'root' })
export class IndicadoresProactivosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma-indicadores-proactivos`;

  private authHeaders(): HttpHeaders {
    const token =
      typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  getTiposInspeccion(): Observable<InspeccionTipoDto[]> {
    return this.http.get<InspeccionTipoDto[]>(`${this.base}/tipos-inspeccion`, {
      headers: this.authHeaders(),
    });
  }

  getProgramacion(proyectoId: number, mes: number, anio: number): Observable<ProgInspeccionResumenDto> {
    const params = new HttpParams()
      .set('proyectoId', proyectoId)
      .set('mes', mes)
      .set('anio', anio);
    return this.http.get<ProgInspeccionResumenDto>(`${this.base}/programacion`, {
      headers: this.authHeaders(),
      params,
    });
  }

  guardarProgramacion(request: GuardarProgInspeccionRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/programacion`, request, {
      headers: this.authHeaders(),
    });
  }

  getSeguimiento(mes: number, anio: number, incluirOcultos = false): Observable<IndicadorProactivoProyectoDto[]> {
    const params = new HttpParams()
      .set('mes', mes)
      .set('anio', anio)
      .set('incluirOcultos', incluirOcultos);
    return this.http.get<IndicadorProactivoProyectoDto[]>(`${this.base}/seguimiento`, {
      headers: this.authHeaders(),
      params,
    });
  }

  ocultarEmpresa(empresaId: number, motivo?: string): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/empresas/${empresaId}/ocultar`,
      { motivo },
      { headers: this.authHeaders() },
    );
  }

  mostrarEmpresa(empresaId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/empresas/${empresaId}/mostrar`,
      {},
      { headers: this.authHeaders() },
    );
  }

  getIndicadoresProyecto(
    proyectoId: number,
    mes: number,
    anio: number,
  ): Observable<IndicadorProactivoProyectoDto> {
    const params = new HttpParams().set('mes', mes).set('anio', anio);
    return this.http.get<IndicadorProactivoProyectoDto>(`${this.base}/proyecto/${proyectoId}`, {
      headers: this.authHeaders(),
      params,
    });
  }

  getPuntaje(proyectoId: number, mes: number, anio: number): Observable<PuntajeMesDto> {
    const params = new HttpParams().set('mes', mes).set('anio', anio);
    return this.http.get<PuntajeMesDto>(`${this.base}/puntaje/${proyectoId}`, {
      headers: this.authHeaders(),
      params,
    });
  }

  getPuntajeTodos(mes: number, anio: number): Observable<PuntajeMesDto[]> {
    const params = new HttpParams().set('mes', mes).set('anio', anio);
    return this.http.get<PuntajeMesDto[]>(`${this.base}/puntaje`, {
      headers: this.authHeaders(),
      params,
    });
  }

  getReactivosTodos(mes: number, anio: number): Observable<IndicadorReactivoProyectoDto[]> {
    const params = new HttpParams().set('mes', mes).set('anio', anio);
    return this.http.get<IndicadorReactivoProyectoDto[]>(`${this.base}/reactivos`, {
      headers: this.authHeaders(),
      params,
    });
  }

  getMetaAnual(anio: number): Observable<MetaAnualDto> {
    return this.http.get<MetaAnualDto>(`${this.base}/meta-anual/${anio}`, {
      headers: this.authHeaders(),
    });
  }

  guardarMetaAnual(request: GuardarMetaAnualRequest): Observable<MetaAnualDto> {
    return this.http.put<MetaAnualDto>(`${this.base}/meta-anual`, request, {
      headers: this.authHeaders(),
    });
  }
}
