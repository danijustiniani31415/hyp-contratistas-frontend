import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

export interface EntregableResumenDto {
  nombre: string;
  estado: string;
  vigencia: string | null;
}

export interface ConsultaResultDto {
  workerId: number;
  apellidoNombre: string;
  dni: string;
  empresaNombre: string;
  proyectoNombre: string;
  estadoHabilitacion: string;
  empresaActiva: boolean;
  documentosFaltantes: string[] | null;
  documentosPorVencer: { nombre: string; vigencia: string }[] | null;
  entregables: EntregableResumenDto[] | null;
  empresaHabilitada: boolean;
  motivoNoAutorizado: string | null;
  restringido: boolean;
}

export interface InduccionHoyDto {
  induccionId: number;
  apellidoNombre: string;
  dni: string;
  empresaNombre: string;
  fechaProgramada: string;
  trabajoAltura: boolean;
  equipoElectrico: boolean;
  estado: string;
  ingresoConfirmado: boolean;
}

export interface NoAutorizadoDto {
  workerId: number;
  apellidoNombre: string;
  dni: string | null;
  empresaNombre: string;
  proyectoNombre: string;
  estadoHabilitacion: string;
  empresaHabilitada: boolean;
  motivoNoAutorizado: string | null;
}

export interface TareoPartidaDto {
  id: number;
  nombre: string;
}

export interface TareoEmpresaDto {
  empresaId: number;
  empresaNombre: string;
}

export interface TareoDetalleCasaDto {
  partidaId: number;
  cantidadPersonas: number;
}

export interface TareoDetalleContratistaDto {
  empresaId: number;
  cantidadPersonas: number;
}

export interface TareoDto {
  id?: number;
  proyectoId: number;
  fecha: string;
  detallesCasa: TareoDetalleCasaDto[];
  detallesContratista: TareoDetalleContratistaDto[];
}

@Injectable({ providedIn: 'root' })
export class ControlAccesoService {
  private readonly base = `${HABILITACION_BASE}/control-acceso`;

  constructor(private http: HttpClient) {}

  consultar(proyectoId: number, query: string): Observable<ConsultaResultDto[]> {
    return this.http.get<ConsultaResultDto[]>(`${this.base}/consulta`, {
      headers: buildHabHeaders(),
      params: buildHabParams({ proyectoId, search: query }),
    });
  }

  getInducciones(): Observable<InduccionHoyDto[]> {
    return this.http.get<InduccionHoyDto[]>(`${this.base}/inducciones-hoy`, {
      headers: buildHabHeaders(),
    });
  }

  confirmarIngreso(id: number): Observable<InduccionHoyDto> {
    return this.http.post<InduccionHoyDto>(
      `${this.base}/inducciones/${id}/confirmar-ingreso`,
      {},
      { headers: buildHabHeaders() },
    );
  }

  getNoAutorizados(proyectoId: number, estadoHabilitacion?: string): Observable<NoAutorizadoDto[]> {
    return this.http.get<NoAutorizadoDto[]>(`${this.base}/no-autorizados`, {
      headers: buildHabHeaders(),
      params: buildHabParams({ proyectoId, estadoHabilitacion }),
    });
  }

  getPartidas(): Observable<TareoPartidaDto[]> {
    return this.http.get<TareoPartidaDto[]>(`${this.base}/tareo/partidas`, {
      headers: buildHabHeaders(),
    });
  }

  getEmpresasTareo(proyectoId: number): Observable<TareoEmpresaDto[]> {
    return this.http.get<TareoEmpresaDto[]>(`${this.base}/tareo/empresas`, {
      headers: buildHabHeaders(),
      params: buildHabParams({ proyectoId }),
    });
  }

  getTareo(proyectoId: number, fecha: string): Observable<TareoDto> {
    return this.http.get<TareoDto>(`${this.base}/tareo`, {
      headers: buildHabHeaders(),
      params: buildHabParams({ proyectoId, fecha }),
    });
  }

  saveTareo(body: TareoDto): Observable<TareoDto> {
    return this.http.post<TareoDto>(`${this.base}/tareo`, body, {
      headers: buildHabHeaders(),
    });
  }

  updateTareo(id: number, body: TareoDto): Observable<TareoDto> {
    return this.http.put<TareoDto>(`${this.base}/tareo/${id}`, body, {
      headers: buildHabHeaders(),
    });
  }
}
