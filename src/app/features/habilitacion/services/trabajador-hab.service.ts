import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../core/dtos/api/pagedResponse.model';
import {
  AgregarProyectoDto,
  DocumentoVersionDto,
  InterconsultaPendienteHabDto,
  WorkerDetalleDto,
  WorkerEditDto,
  WorkerEntregableDto,
  WorkerEntregableUpdateDto,
  WorkerEventoDto,
  WorkerHabilitacionListDto,
  WorkerProyectoDto,
  WorkerReingresoDto,
} from '../dtos/trabajador.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class TrabajadorHabService {
  private readonly base = `${HABILITACION_BASE}/trabajadores`;

  constructor(private http: HttpClient) {}

  getTrabajadores(
    params: Record<string, unknown> = {},
  ): Observable<PagedResponseDTO<WorkerHabilitacionListDto>> {
    return this.http.get<PagedResponseDTO<WorkerHabilitacionListDto>>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams(params),
    });
  }

  getInterconsultasPendientes(): Observable<InterconsultaPendienteHabDto[]> {
    return this.http.get<InterconsultaPendienteHabDto[]>(`${this.base}/interconsultas-pendientes`, {
      headers: buildHabHeaders(),
    });
  }

  getWorker(workerId: number): Observable<WorkerDetalleDto> {
    return this.http.get<WorkerDetalleDto>(`${this.base}/${workerId}`, {
      headers: buildHabHeaders(),
    });
  }

  updateWorker(workerId: number, dto: WorkerEditDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${workerId}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  getEntregables(workerId: number): Observable<WorkerEntregableDto[]> {
    return this.http.get<WorkerEntregableDto[]>(`${this.base}/${workerId}/entregables`, {
      headers: buildHabHeaders(),
    });
  }

  updateEntregable(
    id: number,
    dto: WorkerEntregableUpdateDto,
  ): Observable<WorkerEntregableDto> {
    return this.http.put<WorkerEntregableDto>(`${this.base}/entregables/${id}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  getVersiones(id: number): Observable<DocumentoVersionDto[]> {
    return this.http.get<DocumentoVersionDto[]>(
      `${this.base}/entregables/${id}/versiones`,
      { headers: buildHabHeaders() },
    );
  }

  cambiarObra(workerId: number, dto: any): Observable<void> {
    return this.http.patch<void>(`${this.base}/${workerId}/cambiar-obra`, dto, {
      headers: buildHabHeaders(),
    });
  }

  reingreso(workerId: number, proyectoId: number, empresaId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${workerId}/reingreso`,
      { proyectoId, empresaId },
      { headers: buildHabHeaders() },
    );
  }

  reingresar(id: number, dto: WorkerReingresoDto): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/reingreso`, dto, {
      headers: buildHabHeaders(),
    });
  }

  getEventos(workerId: number): Observable<WorkerEventoDto[]> {
    return this.http.get<WorkerEventoDto[]>(`${this.base}/${workerId}/eventos`, {
      headers: buildHabHeaders(),
    });
  }

  retirarWorker(id: number, fechaRetiro?: string): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${id}/baja`,
      { fechaRetiro },
      { headers: buildHabHeaders() },
    );
  }

  retirarWorkerMasivo(ids: number[], fechaRetiro?: string): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/baja-masiva`,
      { ids, fechaRetiro },
      { headers: buildHabHeaders() },
    );
  }

  getProyectos(workerId: number): Observable<WorkerProyectoDto[]> {
    return this.http.get<WorkerProyectoDto[]>(`${this.base}/${workerId}/proyectos`, {
      headers: buildHabHeaders(),
    });
  }

  agregarProyecto(workerId: number, dto: AgregarProyectoDto): Observable<WorkerProyectoDto> {
    return this.http.post<WorkerProyectoDto>(`${this.base}/${workerId}/proyectos`, dto, {
      headers: buildHabHeaders(),
    });
  }

  retirarDeProyecto(workerId: number, proyectoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${workerId}/proyectos/${proyectoId}`, {
      headers: buildHabHeaders(),
    });
  }

  marcarInduccion(workerId: number, proyectoId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${workerId}/proyectos/${proyectoId}/induccion`,
      {},
      { headers: buildHabHeaders() },
    );
  }

  getProyectosActivos(): Observable<{ id: number; nombre: string }[]> {
    return this.http.get<{ id: number; nombre: string }[]>(`${HABILITACION_BASE}/proyectos`, {
      headers: buildHabHeaders(),
    });
  }

  /**
   * Proyectos del desplegable de "Programar Inducción". Tiene su propio filtro
   * (`HABILITACION_INDUCCION`) aparte del de Habilitación general de `getProyectosActivos`,
   * porque hay proyectos inducibles que no deben salir en el filtro de la lista de
   * trabajadores, en EMOs programados ni en la asignación de proyectos por empresa.
   */
  getProyectosInduccion(): Observable<{ id: number; nombre: string }[]> {
    return this.http.get<{ id: number; nombre: string }[]>(
      `${HABILITACION_BASE}/proyectos/induccion`,
      { headers: buildHabHeaders() },
    );
  }
}
