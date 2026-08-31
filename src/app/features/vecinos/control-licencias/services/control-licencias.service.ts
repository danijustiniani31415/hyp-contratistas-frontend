import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiMessageDTO } from '../../../../core/dtos/api/ApiMessage.model';
import {
  ProjectOptionDTO,
  VecinoLicenciaPlantillaResponseDTO,
  VecinoLicenciaTipoDTO,
  VecinoLicenciaTipoCreateDTO,
  VecinoLicenciaTipoBaseUpsertDTO,
  VecinoLicenciaUploadDTO,
  VecinoLicenciaHistorialItemDTO,
  VecinoLicenciaDestinatarioDTO,
  VecinoLicenciaDestinatariosResponseDTO,
  VecinoLicenciaRecordatorioDTO,
  VecinoLicenciaRecordatorioCreateDTO,
} from '../dtos/control-licencias.dto';

@Injectable({ providedIn: 'root' })
export class ControlLicenciasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ControlLicencias`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { [header: string]: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  getProyectos(): Observable<ProjectOptionDTO[]> {
    return this.http.get<ProjectOptionDTO[]>(`${this.apiUrl}/proyectos`, { headers: this.authHeaders() });
  }

  getPlantilla(projectId: number): Observable<VecinoLicenciaPlantillaResponseDTO> {
    return this.http.get<VecinoLicenciaPlantillaResponseDTO>(`${this.apiUrl}/proyectos/${projectId}`, {
      headers: this.authHeaders(),
    });
  }

  addTipo(projectId: number, dto: VecinoLicenciaTipoCreateDTO): Observable<{ tipo: VecinoLicenciaTipoDTO; message: string }> {
    return this.http.post<{ tipo: VecinoLicenciaTipoDTO; message: string }>(
      `${this.apiUrl}/proyectos/${projectId}/tipos`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  getCatalogoBase(): Observable<VecinoLicenciaTipoDTO[]> {
    return this.http.get<VecinoLicenciaTipoDTO[]>(`${this.apiUrl}/catalogo`, { headers: this.authHeaders() });
  }

  addTipoBase(dto: VecinoLicenciaTipoBaseUpsertDTO): Observable<{ tipo: VecinoLicenciaTipoDTO; message: string }> {
    return this.http.post<{ tipo: VecinoLicenciaTipoDTO; message: string }>(`${this.apiUrl}/catalogo`, dto, {
      headers: this.authHeaders(),
    });
  }

  updateTipo(tipoId: number, dto: VecinoLicenciaTipoBaseUpsertDTO): Observable<{ tipo: VecinoLicenciaTipoDTO; message: string }> {
    return this.http.put<{ tipo: VecinoLicenciaTipoDTO; message: string }>(`${this.apiUrl}/catalogo/${tipoId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  deleteTipo(tipoId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/catalogo/${tipoId}`, { headers: this.authHeaders() });
  }

  uploadLicencia(projectId: number, tipoId: number, dto: VecinoLicenciaUploadDTO, file: File): Observable<ApiMessageDTO> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fechaVencimiento', dto.fechaVencimiento);
    dto.diasAntesRecordatorio.forEach((d) => formData.append('diasAntesRecordatorio', d.toString()));
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/proyectos/${projectId}/tipos/${tipoId}/upload`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  addRecordatorio(
    projectId: number,
    tipoId: number,
    dto: VecinoLicenciaRecordatorioCreateDTO,
  ): Observable<{ recordatorio: VecinoLicenciaRecordatorioDTO; message: string }> {
    return this.http.post<{ recordatorio: VecinoLicenciaRecordatorioDTO; message: string }>(
      `${this.apiUrl}/proyectos/${projectId}/tipos/${tipoId}/recordatorios`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  deleteRecordatorio(recordatorioId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/recordatorios/${recordatorioId}`, {
      headers: this.authHeaders(),
    });
  }

  setNoAplica(projectId: number, tipoId: number, noAplica: boolean): Observable<ApiMessageDTO> {
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/proyectos/${projectId}/tipos/${tipoId}/no-aplica`,
      { noAplica },
      { headers: this.authHeaders() },
    );
  }

  getHistorial(projectId: number, tipoId: number): Observable<VecinoLicenciaHistorialItemDTO[]> {
    return this.http.get<VecinoLicenciaHistorialItemDTO[]>(
      `${this.apiUrl}/proyectos/${projectId}/tipos/${tipoId}/historial`,
      { headers: this.authHeaders() },
    );
  }

  getDestinatarios(projectId: number): Observable<VecinoLicenciaDestinatariosResponseDTO> {
    return this.http.get<VecinoLicenciaDestinatariosResponseDTO>(`${this.apiUrl}/proyectos/${projectId}/destinatarios`, {
      headers: this.authHeaders(),
    });
  }

  addDestinatario(
    projectId: number,
    rol: string,
    email: string,
  ): Observable<{ destinatario: VecinoLicenciaDestinatarioDTO; message: string }> {
    return this.http.post<{ destinatario: VecinoLicenciaDestinatarioDTO; message: string }>(
      `${this.apiUrl}/proyectos/${projectId}/destinatarios`,
      { rol, email },
      { headers: this.authHeaders() },
    );
  }

  deleteDestinatario(destinatarioId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/destinatarios/${destinatarioId}`, {
      headers: this.authHeaders(),
    });
  }
}
