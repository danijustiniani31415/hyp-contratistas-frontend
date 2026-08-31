import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { buildAuthHeaders } from '../../services/http-base';
import { PasoEjecucionDto, CreateEjecucionDto } from '../dtos/paso.dtos';
import { PasoEjecucionArchivoDto } from '../dtos/paso.dtos';

const EJECUCION_BASE = `${environment.apiUrl}api/v1/ssoma-paso/ejecucion`;

@Injectable({ providedIn: 'root' })
export class PasoEjecucionService {
  constructor(private http: HttpClient) {}

  create(dto: CreateEjecucionDto): Observable<PasoEjecucionDto> {
    return this.http.post<PasoEjecucionDto>(EJECUCION_BASE, dto, { headers: buildAuthHeaders() });
  }

  programar(dto: { actividadId: number; fechaProgramada: string }): Observable<PasoEjecucionDto> {
    return this.http.post<PasoEjecucionDto>(`${EJECUCION_BASE}/programar`, dto, { headers: buildAuthHeaders() });
  }

  reprogramar(id: number, dto: { nuevaFecha: string; motivo: string }): Observable<PasoEjecucionDto> {
    return this.http.patch<PasoEjecucionDto>(`${EJECUCION_BASE}/${id}/reprogramar`, dto, { headers: buildAuthHeaders() });
  }

  subirEvidencia(id: number, file: File): Observable<PasoEjecucionDto> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.patch<PasoEjecucionDto>(`${EJECUCION_BASE}/${id}/evidencia`, fd, {
      headers: buildAuthHeaders(),
    });
  }

  agregarArchivo(ejecucionId: number, file: File): Observable<PasoEjecucionDto> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<PasoEjecucionDto>(
      `${EJECUCION_BASE}/${ejecucionId}/archivos`, fd,
      { headers: buildAuthHeaders() }
    );
  }

  eliminarArchivo(archivoId: number): Observable<void> {
    return this.http.delete<void>(
      `${EJECUCION_BASE}/archivos/${archivoId}`,
      { headers: buildAuthHeaders() }
    );
  }
}
