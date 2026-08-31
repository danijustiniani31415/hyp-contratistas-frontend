import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import {
  CronogramaActividadDTO,
  CronogramaFormDataDTO,
  CronogramaSaveDTO,
} from '../dtos/cronograma.dto';

@Injectable({
  providedIn: 'root',
})
export class CronogramaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/costosCronograma`;

  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Catálogo de actividades + nodos del cronograma existente de la adjudicación. */
  getFormData(projectSubContractorId: number): Observable<CronogramaFormDataDTO> {
    return this.http.get<CronogramaFormDataDTO>(`${this.apiUrl}/form-data/${projectSubContractorId}`, {
      headers: this.authHeaders(),
    });
  }

  /** Crea una actividad en el catálogo. */
  createActividad(nombre: string): Observable<CronogramaActividadDTO> {
    return this.http.post<CronogramaActividadDTO>(
      `${this.apiUrl}/actividad`,
      { nombre },
      { headers: this.authHeaders() },
    );
  }

  /** Guarda (reemplaza) el árbol del cronograma de la adjudicación. */
  save(projectSubContractorId: number, dto: CronogramaSaveDTO): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}/${projectSubContractorId}`, dto, {
      headers: this.authHeaders(),
    });
  }
}
