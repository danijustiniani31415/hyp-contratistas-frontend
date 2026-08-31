import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import {
  GaLugarConfigItemDto,
  GaLugarCreateBatchDto,
  GaLugarEditDto,
  ToggleProyectoResultDto,
} from '../dtos/ga-lugar.dto';

@Injectable({ providedIn: 'root' })
export class GaLugarService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-administrativa/configuracion/lugares`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  getAll(): Observable<GaLugarConfigItemDto[]> {
    return this.http.get<GaLugarConfigItemDto[]>(this.apiUrl, { headers: this.headers });
  }

  createBatch(dto: GaLugarCreateBatchDto): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(this.apiUrl, dto, { headers: this.headers });
  }

  /** Toggle de un lugar fijo o proyecto ya registrado en ga_lugar. */
  toggle(gaLugarId: number): Observable<{ activo: boolean }> {
    return this.http.patch<{ activo: boolean }>(
      `${this.apiUrl}/${gaLugarId}/toggle`,
      {},
      { headers: this.headers },
    );
  }

  /** Toggle UPSERT de un proyecto (crea la fila en ga_lugar si no existe). */
  toggleProyecto(projectId: number): Observable<ToggleProyectoResultDto> {
    return this.http.patch<ToggleProyectoResultDto>(
      `${this.apiUrl}/proyecto/${projectId}/toggle`,
      {},
      { headers: this.headers },
    );
  }

  /** Edita el nombre de un lugar fijo. */
  edit(gaLugarId: number, dto: GaLugarEditDto): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}/${gaLugarId}`, dto, {
      headers: this.headers,
    });
  }
}
