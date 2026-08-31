import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../core/dtos/api/pagedResponse.model';
import { BandejaAprobarDto, BandejaItemDto } from '../dtos/bandeja.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class BandejaService {
  private readonly base = `${HABILITACION_BASE}/bandeja`;

  constructor(private http: HttpClient) {}

  getPendientes(
    params: Record<string, unknown> = {},
  ): Observable<PagedResponseDTO<BandejaItemDto>> {
    return this.http.get<PagedResponseDTO<BandejaItemDto>>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams(params),
    });
  }

  getEmpresasDisponibles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/empresas`, {
      headers: buildHabHeaders(),
    });
  }

  aprobarTrabajador(id: number, dto: BandejaAprobarDto): Observable<void> {
    return this.http.patch<void>(`${this.base}/trabajador/${id}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  aprobarEmpresa(id: number, dto: BandejaAprobarDto): Observable<void> {
    return this.http.patch<void>(`${this.base}/empresa/${id}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  aprobarEquipo(id: number, dto: BandejaAprobarDto): Observable<void> {
    return this.http.patch<void>(`${this.base}/equipo/${id}`, dto, {
      headers: buildHabHeaders(),
    });
  }

  aprobarInduccion(id: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/induccion/${id}`, {}, {
      headers: buildHabHeaders(),
    });
  }

  bulkAprobar(ids: number[], tipo: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/bulk-aprobar`, { ids, tipo }, {
      headers: buildHabHeaders(),
    });
  }
}
