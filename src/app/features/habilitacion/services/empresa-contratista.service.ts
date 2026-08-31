import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../core/dtos/api/pagedResponse.model';
import {
  EmpresaContratistaCreateDto,
  EmpresaContratistaDetalleDto,
  EmpresaContratistaListDto,
  EmpresaSimpleDto,
} from '../dtos/empresa.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class EmpresaContratistaService {
  private readonly base = `${HABILITACION_BASE}/empresas`;

  constructor(private http: HttpClient) {}

  getEmpresas(
    params: Record<string, unknown> = {},
  ): Observable<PagedResponseDTO<EmpresaContratistaListDto>> {
    return this.http.get<PagedResponseDTO<EmpresaContratistaListDto>>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams(params),
    });
  }

  getMiProyectoActual(): Observable<{ proyectoId: number | null }> {
    return this.http.get<{ proyectoId: number | null }>(`${this.base}/mi-proyecto-actual`, {
      headers: buildHabHeaders(),
    });
  }

  getEmpresa(id: number): Observable<EmpresaContratistaDetalleDto> {
    return this.http.get<EmpresaContratistaDetalleDto>(`${this.base}/${id}`, {
      headers: buildHabHeaders(),
    });
  }

  createEmpresa(dto: EmpresaContratistaCreateDto): Observable<EmpresaContratistaListDto> {
    return this.http.post<EmpresaContratistaListDto>(this.base, dto, {
      headers: buildHabHeaders(),
    });
  }

  updateEmpresa(
    id: number,
    dto: Partial<EmpresaContratistaCreateDto>,
  ): Observable<EmpresaContratistaListDto> {
    return this.http.put<EmpresaContratistaListDto>(`${this.base}/${id}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  updatePassword(id: number, password: string): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${id}/password`,
      { password },
      { headers: buildHabHeaders() },
    );
  }

  getProyectos(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/${id}/proyectos`, {
      headers: buildHabHeaders(),
    });
  }

  addProyecto(id: number, proyectoId: number): Observable<void> {
    return this.http.post<void>(
      `${this.base}/${id}/proyectos`,
      { proyectoId },
      { headers: buildHabHeaders() },
    );
  }

  removeProyecto(id: number, proyectoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/proyectos/${proyectoId}`, {
      headers: buildHabHeaders(),
    });
  }

  getEmpresasLogin(): Observable<EmpresaSimpleDto[]> {
    return this.http.get<EmpresaSimpleDto[]>(`${HABILITACION_BASE}/auth/empresas`);
  }
}
