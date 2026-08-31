import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HABILITACION_BASE, buildHabHeaders } from './http-base';

export interface UploadResultDto {
  url: string;
  path: string;
}

// TODO Sprint 7 Backend: implementar POST /archivos/subir
// Ver Features/HabilitacionModule/Presentation/ArchivoHabilitacionController.cs
@Injectable({ providedIn: 'root' })
export class SharepointUploadService {
  private readonly uploadUrl = `${HABILITACION_BASE}/archivos/subir`;

  constructor(private http: HttpClient) {}

  subirArchivo(file: File, contexto: string): Observable<UploadResultDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contexto', contexto);
    return this.http.post<UploadResultDto>(this.uploadUrl, formData, {
      headers: buildHabHeaders(),
    });
  }

  getArchivoUrl(path: string, ctx?: string): Observable<UploadResultDto> {
    const params: Record<string, string> = { path };
    if (ctx) params['ctx'] = ctx;
    return this.http.get<UploadResultDto>(`${HABILITACION_BASE}/archivos/url`, {
      headers: buildHabHeaders(),
      params,
    });
  }

  subirArchivoMultiple(file: File, contexto: string): Observable<{
    path: string;
    nombreArchivo: string;
    esZip: boolean;
    zipContenido?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contexto', contexto);
    return this.http.post<any>(`${HABILITACION_BASE}/archivos/subir-multiple`, formData, {
      headers: buildHabHeaders(),
    });
  }

  enviarDocumento(dto: {
    habTrabajadorId?: number;
    habEmpresaId?: number;
    habEquipoId?: number;
    vigencia?: string;
    obsContratista?: string;
    mes?: number;
    anio?: number;
    archivos: {
      archivoUrl: string;
      nombreArchivo?: string;
      esZip: boolean;
      zipContenido?: string;
    }[];
  }): Observable<{ versionId: number; archivos: number }> {
    return this.http.post<any>(`${HABILITACION_BASE}/archivos/enviar`, dto, {
      headers: buildHabHeaders(),
    });
  }
}
