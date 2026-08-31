import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { buildHabHeaders, buildHabParams } from './http-base';
import {
  ClinicaPagedResult,
  ClinicaUsuarioCreateDto,
  ClinicaUsuarioListDto,
  ClinicaUsuarioUpdateDto,
} from '../dtos/clinica.model';

@Injectable({ providedIn: 'root' })
export class ClinicaUsuarioService {
  private base(clinicaId: number): string {
    return `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/catalogos/clinicas/${clinicaId}/usuarios`;
  }

  constructor(private http: HttpClient) {}

  getUsuarios(
    clinicaId: number,
    page = 1,
    pageSize = 20,
  ): Observable<ClinicaPagedResult<ClinicaUsuarioListDto>> {
    return this.http.get<ClinicaPagedResult<ClinicaUsuarioListDto>>(this.base(clinicaId), {
      headers: buildHabHeaders(),
      params: buildHabParams({ page, pageSize }),
    });
  }

  getUsuario(clinicaId: number, usuarioId: number): Observable<ClinicaUsuarioListDto> {
    return this.http.get<ClinicaUsuarioListDto>(`${this.base(clinicaId)}/${usuarioId}`, {
      headers: buildHabHeaders(),
    });
  }

  crearUsuario(
    clinicaId: number,
    dto: ClinicaUsuarioCreateDto,
  ): Observable<ClinicaUsuarioListDto> {
    return this.http.post<ClinicaUsuarioListDto>(this.base(clinicaId), dto, {
      headers: buildHabHeaders(),
    });
  }

  actualizarUsuario(
    clinicaId: number,
    usuarioId: number,
    dto: ClinicaUsuarioUpdateDto,
  ): Observable<ClinicaUsuarioListDto> {
    return this.http.put<ClinicaUsuarioListDto>(`${this.base(clinicaId)}/${usuarioId}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  toggleActivo(clinicaId: number, usuarioId: number): Observable<void> {
    return this.http.patch<void>(
      `${this.base(clinicaId)}/${usuarioId}/toggle-activo`,
      {},
      { headers: buildHabHeaders() },
    );
  }

  softDelete(clinicaId: number, usuarioId: number): Observable<void> {
    return this.http.delete<void>(`${this.base(clinicaId)}/${usuarioId}`, {
      headers: buildHabHeaders(),
    });
  }

  reenviarActivacion(clinicaId: number, usuarioId: number): Observable<void> {
    return this.http.post<void>(
      `${this.base(clinicaId)}/${usuarioId}/reenviar-activacion`,
      {},
      { headers: buildHabHeaders() },
    );
  }
}
