import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EmpresaEntregableDto,
  EmpresaEntregableUpdateDto,
  EmpresaPorProyectoDto,
  EmpresaProyectoDto,
  EntregableMesDto,
  ProyectoDisponibleDto,
} from '../dtos/empresa.model';
import { DocumentoVersionDto } from '../dtos/trabajador.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class HabEmpresaService {
  private readonly base = `${HABILITACION_BASE}/empresas`;

  constructor(private http: HttpClient) {}

  getEntregables(
    empresaId: number,
    proyectoId: number,
    mes?: number,
    anio?: number,
  ): Observable<EmpresaEntregableDto[]> {
    return this.http.get<EmpresaEntregableDto[]>(
      `${this.base}/${empresaId}/entregables`,
      {
        headers: buildHabHeaders(),
        params: buildHabParams({ proyectoId, mes, anio }),
      },
    );
  }

  updateEntregable(
    empresaId: number,
    itemId: number,
    dto: EmpresaEntregableUpdateDto,
  ): Observable<EmpresaEntregableDto> {
    return this.http.put<EmpresaEntregableDto>(
      `${this.base}/${empresaId}/entregables/${itemId}`,
      dto,
      { headers: buildHabHeaders() },
    );
  }

  getVersiones(empresaId: number, itemId: number): Observable<DocumentoVersionDto[]> {
    return this.http.get<DocumentoVersionDto[]>(
      `${this.base}/${empresaId}/entregables/${itemId}/versiones`,
      { headers: buildHabHeaders() },
    );
  }

  getProyectos(empresaId: number): Observable<EmpresaProyectoDto[]> {
    return this.http.get<EmpresaProyectoDto[]>(`${this.base}/${empresaId}/proyectos`, {
      headers: buildHabHeaders(),
    });
  }

  getProyectosDisponibles(empresaId: number): Observable<ProyectoDisponibleDto[]> {
    return this.http.get<ProyectoDisponibleDto[]>(
      `${this.base}/${empresaId}/proyectos-disponibles`,
      { headers: buildHabHeaders() },
    );
  }

  activarProyecto(empresaId: number, proyectoId: number): Observable<void> {
    return this.http.post<void>(
      `${this.base}/${empresaId}/activar-proyecto`,
      { proyectoId },
      { headers: buildHabHeaders() },
    );
  }

  desactivarProyecto(empresaId: number, proyectoId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${empresaId}/desactivar-proyecto`,
      { headers: buildHabHeaders(), body: { proyectoId } },
    );
  }

  getMesesEntregable(
    empresaId: number,
    itemId: number,
    proyectoId: number,
  ): Observable<EntregableMesDto[]> {
    return this.http.get<EntregableMesDto[]>(
      `${this.base}/${empresaId}/entregables/${itemId}/meses`,
      {
        headers: buildHabHeaders(),
        params: buildHabParams({ proyectoId }),
      },
    );
  }

  aprobarMes(
    empresaId: number,
    entregableId: number,
    dto: EmpresaEntregableUpdateDto,
  ): Observable<EmpresaEntregableDto> {
    return this.http.patch<EmpresaEntregableDto>(
      `${this.base}/${empresaId}/entregables/${entregableId}/mes`,
      dto,
      { headers: buildHabHeaders() },
    );
  }

  /** Vista proyecto-primero: empresas activas en un proyecto con su estado de habilitación y
   * sus entregables subidos/faltantes agrupados por responsable (SSOMA/Administración). */
  getEmpresasPorProyecto(proyectoId: number): Observable<EmpresaPorProyectoDto[]> {
    return this.http.get<EmpresaPorProyectoDto[]>(
      `${HABILITACION_BASE}/proyectos/${proyectoId}/empresas`,
      { headers: buildHabHeaders() },
    );
  }

  eliminarArchivo(empresaId: number, archivoId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${empresaId}/archivos/${archivoId}`,
      { headers: buildHabHeaders() },
    );
  }
}
