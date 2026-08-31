import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../core/dtos/api/pagedResponse.model';
import { AuditoriaCambioDto } from '../dtos/auditoria.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class AuditoriaHabService {
  private readonly base = `${HABILITACION_BASE}/auditoria`;

  constructor(private http: HttpClient) {}

  getAuditoria(
    params: Record<string, unknown> = {},
  ): Observable<PagedResponseDTO<AuditoriaCambioDto>> {
    return this.http.get<PagedResponseDTO<AuditoriaCambioDto>>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams(params),
    });
  }
}
