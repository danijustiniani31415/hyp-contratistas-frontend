import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { buildHabHeaders } from './http-base';
import { ClinicaDetalleDto, ClinicaListDto, ClinicaUpsertDto } from '../dtos/clinica.model';

@Injectable({ providedIn: 'root' })
export class ClinicaService {
  private readonly base = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional/catalogos/clinicas`;

  constructor(private http: HttpClient) {}

  getClinicas(soloActivos = true): Observable<ClinicaListDto[]> {
    return this.http.get<ClinicaListDto[]>(`${this.base}?soloActivos=${soloActivos}`, {
      headers: buildHabHeaders(),
    });
  }

  getClinica(id: number): Observable<ClinicaDetalleDto> {
    return this.http.get<ClinicaDetalleDto>(`${this.base}/${id}`, {
      headers: buildHabHeaders(),
    });
  }

  crearClinica(dto: ClinicaUpsertDto): Observable<ClinicaDetalleDto> {
    return this.http.post<ClinicaDetalleDto>(this.base, dto, {
      headers: buildHabHeaders(),
    });
  }

  actualizarClinica(id: number, dto: ClinicaUpsertDto): Observable<ClinicaDetalleDto> {
    return this.http.put<ClinicaDetalleDto>(`${this.base}/${id}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  toggleActivo(id: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/toggle-activo`, {}, {
      headers: buildHabHeaders(),
    });
  }
}
