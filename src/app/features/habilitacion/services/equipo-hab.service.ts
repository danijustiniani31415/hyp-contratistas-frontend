import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../core/dtos/api/pagedResponse.model';
import { EquipoEntregableDto, EquipoListDto } from '../dtos/equipo.model';
import { DocumentoVersionDto } from '../dtos/trabajador.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class EquipoHabService {
  private readonly base = `${HABILITACION_BASE}/equipos`;

  constructor(private http: HttpClient) {}

  getEquipos(
    params: Record<string, unknown> = {},
  ): Observable<PagedResponseDTO<EquipoListDto>> {
    return this.http.get<PagedResponseDTO<EquipoListDto>>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams(params),
    });
  }

  getEntregables(equipoId: number): Observable<EquipoEntregableDto[]> {
    return this.http.get<EquipoEntregableDto[]>(`${this.base}/${equipoId}/entregables`, {
      headers: buildHabHeaders(),
    });
  }

  create(dto: any): Observable<EquipoListDto> {
    return this.http.post<EquipoListDto>(this.base, dto, {
      headers: buildHabHeaders(),
    });
  }

  update(id: number, dto: any): Observable<EquipoListDto> {
    return this.http.put<EquipoListDto>(`${this.base}/${id}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  updateEntregable(id: number, dto: any): Observable<EquipoEntregableDto> {
    return this.http.put<EquipoEntregableDto>(`${this.base}/entregables/${id}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  getVersiones(id: number): Observable<DocumentoVersionDto[]> {
    return this.http.get<DocumentoVersionDto[]>(
      `${this.base}/entregables/${id}/versiones`,
      { headers: buildHabHeaders() },
    );
  }
}
