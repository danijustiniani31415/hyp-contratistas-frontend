import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HABILITACION_BASE, buildHabHeaders, buildHabParams } from './http-base';
import {
  DossierSemanaDto,
  DossierSemanaDetalleDto,
  EnsureSemanaRequest,
  RevisarDossierRequest,
  RevisarDocumentoRequest,
  DossierTipoDocumento,
} from '../dtos/dossier.model';

@Injectable({ providedIn: 'root' })
export class DossierService {
  private readonly base = `${HABILITACION_BASE}/dossier`;

  constructor(private http: HttpClient) {}

  // GET /dossier?proyectoId=&contributorId=&anio=
  getSemanas(
    proyectoId?: number | null,
    contributorId?: number | null,
    anio?: number | null,
  ): Observable<DossierSemanaDto[]> {
    return this.http.get<DossierSemanaDto[]>(this.base, {
      headers: buildHabHeaders(),
      params: buildHabParams({
        ...(proyectoId ? { proyectoId } : {}),
        ...(contributorId ? { contributorId } : {}),
        ...(anio ? { anio } : {}),
      }),
    });
  }

  // GET /dossier/{id}
  getDetalle(id: number): Observable<DossierSemanaDetalleDto> {
    return this.http.get<DossierSemanaDetalleDto>(`${this.base}/${id}`, {
      headers: buildHabHeaders(),
    });
  }

  // POST /dossier/semana
  ensureSemana(req: EnsureSemanaRequest): Observable<{ id: number; fechaInicio: string; fechaFin: string }> {
    return this.http.post<{ id: number; fechaInicio: string; fechaFin: string }>(
      `${this.base}/semana`,
      req,
      { headers: buildHabHeaders() },
    );
  }

  // POST /dossier/{dossierId}/documento  [multipart]
  subirDocumento(
    dossierId: number,
    tipoDoc: DossierTipoDocumento,
    file: File,
  ): Observable<{ message: string }> {
    const form = new FormData();
    form.append('TipoDoc', tipoDoc);
    form.append('File', file);
    return this.http.post<{ message: string }>(`${this.base}/${dossierId}/documento`, form, {
      headers: buildHabHeaders(),
    });
  }

  // PATCH /dossier/documento/{docId}/marcar-na
  marcarDocumentoNa(docId: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.base}/documento/${docId}/marcar-na`,
      {},
      { headers: buildHabHeaders() },
    );
  }

  // POST /dossier/{dossierId}/enviar
  enviar(dossierId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${dossierId}/enviar`, {}, {
      headers: buildHabHeaders(),
    });
  }

  // POST /dossier/{dossierId}/revisar
  revisar(dossierId: number, req: RevisarDossierRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${dossierId}/revisar`, req, {
      headers: buildHabHeaders(),
    });
  }

  // PATCH /dossier/documento/{docId}/revisar
  revisarDocumento(docId: number, req: RevisarDocumentoRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.base}/documento/${docId}/revisar`,
      req,
      { headers: buildHabHeaders() },
    );
  }

  // GET /dossier/archivo/{archivoId}/url
  getArchivoUrl(archivoId: number): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.base}/archivo/${archivoId}/url`, {
      headers: buildHabHeaders(),
    });
  }

  // DELETE /dossier/archivo/{archivoId}
  eliminarArchivo(archivoId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/archivo/${archivoId}`, {
      headers: buildHabHeaders(),
    });
  }

  // GET /dossier/documento/{docId}/url
  getDocumentoUrl(docId: number): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.base}/documento/${docId}/url`, {
      headers: buildHabHeaders(),
    });
  }
}
