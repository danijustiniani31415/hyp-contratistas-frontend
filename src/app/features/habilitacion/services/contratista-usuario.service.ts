import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { buildHabHeaders, buildHabParams } from './http-base';

export interface ContratistaUsuarioDto {
  id: number;
  userId: number;
  nombreCompleto: string;
  email: string;
  rolNombre: string;
  scope: string;
  activo: boolean;
  proyectoIds: number[];
  modulos?: string;
}

export interface WorkerBusquedaDto {
  id: number;
  dni: string | null;
  nombreCompleto: string | null;
  emailCorporativo: string | null;
}

export interface InvitarUsuarioDto {
  email: string;
  rolNombre: string;
  scope: string;
  proyectoIds?: number[];
  systemRoleId: number;
  modulos?: string;
  workerId?: number;
  esWorker?: boolean;
}

export interface ActualizarUsuarioDto {
  email?: string;
  rolNombre?: string;
  scope?: string;
  activo?: boolean;
  proyectoIds?: number[];
  modulos?: string;
}

@Injectable({ providedIn: 'root' })
export class ContratistaUsuarioService {
  private readonly base = `${environment.apiUrl}api/v1/contratista-usuarios`;

  constructor(private http: HttpClient) {}

  getUsuarios(contractorId: number): Observable<ContratistaUsuarioDto[]> {
    return this.http.get<ContratistaUsuarioDto[]>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams({ contractorId }),
    });
  }

  invitar(contractorId: number, dto: InvitarUsuarioDto): Observable<ContratistaUsuarioDto> {
    return this.http.post<ContratistaUsuarioDto>(this.base, dto, {
      headers: buildHabHeaders(),
      params: buildHabParams({ contractorId }),
    });
  }

  actualizar(
    id: number,
    contractorId: number,
    dto: ActualizarUsuarioDto,
  ): Observable<ContratistaUsuarioDto> {
    return this.http.put<ContratistaUsuarioDto>(`${this.base}/${id}`, dto, {
      headers: buildHabHeaders(),
      params: buildHabParams({ contractorId }),
    });
  }

  buscarWorkers(contractorId: number, search: string): Observable<WorkerBusquedaDto[]> {
    return this.http.get<WorkerBusquedaDto[]>(
      `${this.base}/${contractorId}/buscar-workers`,
      { headers: buildHabHeaders(), params: { search } },
    );
  }

  desactivar(id: number, contractorId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/${id}/desactivar`,
      {},
      { headers: buildHabHeaders(), params: buildHabParams({ contractorId }) },
    );
  }
}
