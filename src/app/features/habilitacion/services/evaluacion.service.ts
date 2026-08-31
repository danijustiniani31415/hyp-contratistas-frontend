import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagedResponseDTO } from '../../../core/dtos/api/pagedResponse.model';
import {
  CriterioEvalDto,
  EvalCreateDto,
  EvalSupervisorDetalleDto,
  EvalSupervisorListDto,
} from '../dtos/evaluacion.model';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';

@Injectable({ providedIn: 'root' })
export class EvaluacionService {
  private readonly base = `${HABILITACION_BASE}/evaluaciones`;
  private readonly criteriosBase = `${HABILITACION_BASE}/catalogos/criterios`;

  constructor(private http: HttpClient) {}

  getEvaluaciones(
    params: Record<string, unknown> = {},
  ): Observable<PagedResponseDTO<EvalSupervisorListDto>> {
    return this.http.get<PagedResponseDTO<EvalSupervisorListDto>>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams(params),
    });
  }

  create(dto: EvalCreateDto): Observable<EvalSupervisorDetalleDto> {
    return this.http.post<EvalSupervisorDetalleDto>(this.base, dto, {
      headers: buildHabHeaders(),
    });
  }

  getCriterios(): Observable<CriterioEvalDto[]> {
    return this.http.get<CriterioEvalDto[]>(this.criteriosBase, {
      headers: buildHabHeaders(),
    });
  }
}
