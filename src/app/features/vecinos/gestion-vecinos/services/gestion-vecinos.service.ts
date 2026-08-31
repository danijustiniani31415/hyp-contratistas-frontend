import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ApiMessageDTO } from '../../../../core/dtos/api/ApiMessage.model';
import {
  VecinosPageDTO,
  VecinoListItemDTO,
  VecinoLoteRegisterDTO,
  VecinoLoteRegisterResultDTO,
  VecinoUpdateDTO,
  VecinoLoteUpdateDTO,
  VecinoImagenDTO,
  VecinoSolicitudesResponseDTO,
  VecinoSolicitudCreateDTO,
  VecinoCompromisoItemDTO,
  VecinoCompromisoCreateDTO,
  VecinoNormativaDTO,
  VecinoLimpiezaDTO,
  VecinoLimpiezasResponseDTO,
  VecinoLimpiezaCreateDTO,
  VecinoLimpiezaCumplimientoDTO,
  VecinoCompromisoSelectDTO,
  CroquisGestionResponseDTO,
  VecinoRequisitosResponseDTO,
} from '../dtos/gestion-vecinos.dto';

/** Persona devuelta por la consulta RENIEC. */
export interface ReniecPersonDTO {
  document_number: string;
  full_name: string;
  first_name: string;
  first_last_name: string;
  second_last_name: string;
}

export interface VecinoFilter {
  page: number;
  projectId?: number | null;
  vecinoColindanciaId?: number | null;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class GestionVecinosService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/GestionVecinos`;

  constructor(private http: HttpClient) {}

  private authHeaders(): { [header: string]: string } {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private buildParams(filter: VecinoFilter): HttpParams {
    let params = new HttpParams().set('page', filter.page.toString());
    if (filter.projectId)           params = params.set('projectId', filter.projectId.toString());
    if (filter.vecinoColindanciaId) params = params.set('vecinoColindanciaId', filter.vecinoColindanciaId.toString());
    if (filter.search)              params = params.set('search', filter.search);
    return params;
  }

  /** Carga inicial: opciones (filtros + formulario) + primera página. */
  getPageData(filter: VecinoFilter): Observable<VecinosPageDTO> {
    return this.http.get<VecinosPageDTO>(this.apiUrl, {
      params: this.buildParams(filter),
      headers: this.authHeaders(),
    });
  }

  /** Listado filtrado/paginado (sin reconsultar opciones). */
  getList(filter: VecinoFilter): Observable<PagedResponseDTO<VecinoListItemDTO>> {
    return this.http.get<PagedResponseDTO<VecinoListItemDTO>>(`${this.apiUrl}/list`, {
      params: this.buildParams(filter),
      headers: this.authHeaders(),
    });
  }

  // ── Vista por croquis ───────────────────────────────────────────────
  private readonly croquisApiUrl = `${environment.apiUrl}api/v1/ProjectCroquis`;

  /** Todos los croquis registrados con sus lotes y vecinos, más catálogos para el alta. */
  getCroquisGestion(): Observable<CroquisGestionResponseDTO> {
    return this.http.get<CroquisGestionResponseDTO>(`${this.croquisApiUrl}/gestion`, {
      headers: this.authHeaders(),
    });
  }

  getPersonByDni(dni: string): Observable<ReniecPersonDTO> {
    return this.http.get<ReniecPersonDTO>(`${this.apiUrl}/dni/${dni}`, {
      headers: this.authHeaders(),
    });
  }

  /** Registra uno o varios vecinos/departamentos sobre un lote (polígono) del croquis. */
  registerVecinos(dto: VecinoLoteRegisterDTO): Observable<VecinoLoteRegisterResultDTO & { message: string }> {
    return this.http.post<VecinoLoteRegisterResultDTO & { message: string }>(this.apiUrl, dto, {
      headers: this.authHeaders(),
    });
  }

  /** Un vecino/departamento con personas e imágenes frescas (para refrescar el detalle). */
  getById(vecinoId: number): Observable<VecinoListItemDTO> {
    return this.http.get<VecinoListItemDTO>(`${this.apiUrl}/${vecinoId}`, {
      headers: this.authHeaders(),
    });
  }

  /** Edita los datos de un vecino/departamento (sección Detalle) y sus personas. */
  update(vecinoId: number, dto: VecinoUpdateDTO): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}/${vecinoId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  /** Edita los datos a nivel de lote (dirección + observaciones). */
  updateLote(vecinoLoteId: number, dto: VecinoLoteUpdateDTO): Observable<ApiMessageDTO> {
    return this.http.put<ApiMessageDTO>(`${this.apiUrl}/lotes/${vecinoLoteId}`, dto, {
      headers: this.authHeaders(),
    });
  }

  /** Sube una o varias imágenes del estado de la propiedad de una casa/lote. */
  uploadImagenes(vecinoId: number, files: File[]): Observable<{ imagenes: VecinoImagenDTO[]; message: string }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return this.http.post<{ imagenes: VecinoImagenDTO[]; message: string }>(
      `${this.apiUrl}/${vecinoId}/imagenes`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  /** Elimina (soft delete) una imagen del estado de la propiedad. */
  deleteImagen(imagenId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/imagenes/${imagenId}`, {
      headers: this.authHeaders(),
    });
  }

  // ── Solicitudes ─────────────────────────────────────────────────────
  getSolicitudes(vecinoId: number): Observable<VecinoSolicitudesResponseDTO> {
    return this.http.get<VecinoSolicitudesResponseDTO>(`${this.apiUrl}/${vecinoId}/solicitudes`, {
      headers: this.authHeaders(),
    });
  }

  createSolicitud(vecinoId: number, dto: VecinoSolicitudCreateDTO): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}/${vecinoId}/solicitudes`, dto, {
      headers: this.authHeaders(),
    });
  }

  updateSolicitudEstado(solicitudId: number, vecinoSolicitudEstadoId: number): Observable<ApiMessageDTO> {
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/solicitudes/${solicitudId}/estado`,
      { vecinoSolicitudEstadoId },
      { headers: this.authHeaders() },
    );
  }

  /** Edita el texto de una solicitud ya registrada. */
  updateSolicitudDescripcion(solicitudId: number, descripcion: string): Observable<ApiMessageDTO> {
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/solicitudes/${solicitudId}/descripcion`,
      { descripcion },
      { headers: this.authHeaders() },
    );
  }

  // ── Compromisos ─────────────────────────────────────────────────────
  getCompromisos(solicitudId: number): Observable<VecinoCompromisoItemDTO[]> {
    return this.http.get<VecinoCompromisoItemDTO[]>(
      `${this.apiUrl}/solicitudes/${solicitudId}/compromisos`,
      { headers: this.authHeaders() },
    );
  }

  createCompromiso(solicitudId: number, dto: VecinoCompromisoCreateDTO): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/solicitudes/${solicitudId}/compromisos`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  updateCompromisoEstado(compromisoId: number, vecinoCompromisoEstadoId: number): Observable<ApiMessageDTO> {
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/compromisos/${compromisoId}/estado`,
      { vecinoCompromisoEstadoId },
      { headers: this.authHeaders() },
    );
  }

  updateCompromisoObservaciones(compromisoId: number, observaciones: string | null): Observable<ApiMessageDTO> {
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/compromisos/${compromisoId}/observaciones`,
      { observaciones },
      { headers: this.authHeaders() },
    );
  }

  /** Fija o limpia (null) la fecha límite por municipalidad/fiscalización de un compromiso. */
  updateCompromisoFechaMunicipalidad(compromisoId: number, fechaFinMunicipalidad: string | null): Observable<ApiMessageDTO> {
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/compromisos/${compromisoId}/fecha-municipalidad`,
      { fechaFinMunicipalidad },
      { headers: this.authHeaders() },
    );
  }

  updateEntregableEstado(entregableId: number, vecinoEntregableEstadoId: number): Observable<ApiMessageDTO> {
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/compromisos/entregables/${entregableId}/estado`,
      { vecinoEntregableEstadoId },
      { headers: this.authHeaders() },
    );
  }

  uploadEntregable(entregableId: number, file: File): Observable<{ archivoUrl: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ archivoUrl: string; message: string }>(
      `${this.apiUrl}/compromisos/entregables/${entregableId}/upload`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  /** Sube uno o varios archivos de "normativas" a un compromiso. */
  uploadNormativas(compromisoId: number, files: File[]): Observable<{ normativas: VecinoNormativaDTO[]; message: string }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return this.http.post<{ normativas: VecinoNormativaDTO[]; message: string }>(
      `${this.apiUrl}/compromisos/${compromisoId}/normativas`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  deleteNormativa(normativaId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(
      `${this.apiUrl}/compromisos/normativas/${normativaId}`,
      { headers: this.authHeaders() },
    );
  }

  // ── Calendario de limpiezas ─────────────────────────────────────────
  getLimpiezas(projectId: number, year: number, month: number): Observable<VecinoLimpiezasResponseDTO> {
    const params = new HttpParams().set('year', year.toString()).set('month', month.toString());
    return this.http.get<VecinoLimpiezasResponseDTO>(`${this.apiUrl}/proyectos/${projectId}/limpiezas`, {
      params,
      headers: this.authHeaders(),
    });
  }

  createLimpieza(projectId: number, dto: VecinoLimpiezaCreateDTO): Observable<{ limpieza: VecinoLimpiezaDTO; message: string }> {
    return this.http.post<{ limpieza: VecinoLimpiezaDTO; message: string }>(
      `${this.apiUrl}/proyectos/${projectId}/limpiezas`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  deleteLimpieza(limpiezaId: number): Observable<ApiMessageDTO> {
    return this.http.delete<ApiMessageDTO>(`${this.apiUrl}/limpiezas/${limpiezaId}`, {
      headers: this.authHeaders(),
    });
  }

  getLimpiezasCumplimiento(projectId: number): Observable<VecinoLimpiezaCumplimientoDTO> {
    return this.http.get<VecinoLimpiezaCumplimientoDTO>(
      `${this.apiUrl}/proyectos/${projectId}/limpiezas/cumplimiento`,
      { headers: this.authHeaders() },
    );
  }

  /** Compromisos de las solicitudes de un vecino, para relacionar la atención de limpieza. */
  getCompromisosSelect(vecinoId: number): Observable<VecinoCompromisoSelectDTO[]> {
    return this.http.get<VecinoCompromisoSelectDTO[]>(`${this.apiUrl}/${vecinoId}/compromisos-select`, {
      headers: this.authHeaders(),
    });
  }

  uploadAtencion(limpiezaId: number, file: File, vecinoCompromisoId: number | null): Observable<{ archivoUrl: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (vecinoCompromisoId != null) formData.append('vecinoCompromisoId', vecinoCompromisoId.toString());
    return this.http.post<{ archivoUrl: string; message: string }>(
      `${this.apiUrl}/limpiezas/${limpiezaId}/atencion`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  // ── Requisitos ──────────────────────────────────────────────────────
  getRequisitos(vecinoId: number): Observable<VecinoRequisitosResponseDTO> {
    return this.http.get<VecinoRequisitosResponseDTO>(`${this.apiUrl}/${vecinoId}/requisitos`, {
      headers: this.authHeaders(),
    });
  }

  uploadRequisito(vecinoId: number, tipoId: number, file: File): Observable<{ archivoUrl: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ archivoUrl: string; message: string }>(
      `${this.apiUrl}/${vecinoId}/requisitos/${tipoId}/upload`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  setRequisitoNoAplica(vecinoId: number, tipoId: number, noAplica: boolean): Observable<ApiMessageDTO> {
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/${vecinoId}/requisitos/${tipoId}/no-aplica`,
      { noAplica },
      { headers: this.authHeaders() },
    );
  }
}
