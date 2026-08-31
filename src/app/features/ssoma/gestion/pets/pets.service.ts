import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { buildAuthHeaders } from '../../salud-ocupacional/services/http-base';
import {
  PetListItemDto,
  PetDetalleDto,
  PetPasoDto,
  CrearPetRequest,
  ActualizarPetRequest,
  CrearPetPasoRequest,
  ActualizarPetPasoRequest,
  ReordenarPasosRequest,
  PetsImportPreviewDto,
  ConfirmarImportacionRequest,
  CatalogoItemDto,
  CrearCatalogoItemRequest,
  SeleccionarItemCatalogoRequest,
  AgregarItemPersonalizadoRequest,
  ActualizarFirmaRequest,
} from './pets.dtos';

@Injectable({ providedIn: 'root' })
export class PetsService {
  private base = `${environment.apiUrl}api/v1/pets`;

  constructor(private http: HttpClient) {}

  getList(): Observable<PetListItemDto[]> {
    return this.http.get<PetListItemDto[]>(this.base, { headers: buildAuthHeaders() });
  }

  getDetalle(id: number): Observable<PetDetalleDto> {
    return this.http.get<PetDetalleDto>(`${this.base}/${id}`, { headers: buildAuthHeaders() });
  }

  getPasos(id: number): Observable<PetPasoDto[]> {
    return this.http.get<PetPasoDto[]>(`${this.base}/${id}/pasos`, { headers: buildAuthHeaders() });
  }

  crear(req: CrearPetRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, req, { headers: buildAuthHeaders() });
  }

  actualizar(id: number, req: ActualizarPetRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, req, { headers: buildAuthHeaders() });
  }

  agregarPaso(id: number, req: CrearPetPasoRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/${id}/pasos`, req, { headers: buildAuthHeaders() });
  }

  actualizarPaso(id: number, pasoId: number, req: ActualizarPetPasoRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/pasos/${pasoId}`, req, { headers: buildAuthHeaders() });
  }

  eliminarPaso(id: number, pasoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/pasos/${pasoId}`, { headers: buildAuthHeaders() });
  }

  reordenarPasos(id: number, req: ReordenarPasosRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/pasos/reordenar`, req, { headers: buildAuthHeaders() });
  }

  previewImportarDocx(file: File): Observable<PetsImportPreviewDto> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<PetsImportPreviewDto>(`${this.base}/importar-docx/preview`, fd, {
      headers: buildAuthHeaders(),
    });
  }

  confirmarImportarDocx(id: number, req: ConfirmarImportacionRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/importar-docx/confirmar`, req, {
      headers: buildAuthHeaders(),
    });
  }

  subirImagenPaso(id: number, pasoId: number, file: File): Observable<{ imagenUrl: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ imagenUrl: string }>(
      `${this.base}/${id}/pasos/${pasoId}/imagen`,
      fd,
      { headers: buildAuthHeaders() },
    );
  }

  // ── Secciones de texto único (Introducción / Alcance / Objetivo / Definiciones / Restricciones) ──

  actualizarSeccionTexto(id: number, seccion: string, contenido: string): Observable<void> {
    return this.http.put<void>(
      `${this.base}/${id}/secciones-texto/${seccion}`,
      { contenido },
      { headers: buildAuthHeaders() },
    );
  }

  // ── Catálogo (Marco Legal / EPP / Recursos) ────────────────────────────────

  getCatalogo(grupo: string, tipo?: string | null): Observable<CatalogoItemDto[]> {
    let url = `${this.base}/catalogo?grupo=${encodeURIComponent(grupo)}`;
    if (tipo) url += `&tipo=${encodeURIComponent(tipo)}`;
    return this.http.get<CatalogoItemDto[]>(url, { headers: buildAuthHeaders() });
  }

  crearCatalogoItem(req: CrearCatalogoItemRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/catalogo`, req, { headers: buildAuthHeaders() });
  }

  desactivarCatalogoItem(catalogoItemId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/catalogo/${catalogoItemId}`, { headers: buildAuthHeaders() });
  }

  seleccionarCatalogoItem(id: number, req: SeleccionarItemCatalogoRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/${id}/seleccion`, req, { headers: buildAuthHeaders() });
  }

  agregarItemPersonalizado(id: number, req: AgregarItemPersonalizadoRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/${id}/seleccion/personalizado`, req, {
      headers: buildAuthHeaders(),
    });
  }

  eliminarSeleccion(id: number, seleccionId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/seleccion/${seleccionId}`, { headers: buildAuthHeaders() });
  }

  // ── Anexos ──────────────────────────────────────────────────────────────────

  subirAnexo(id: number, nombre: string, file: File): Observable<{ archivoUrl: string }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('nombre', nombre);
    return this.http.post<{ archivoUrl: string }>(`${this.base}/${id}/anexos`, fd, {
      headers: buildAuthHeaders(),
    });
  }

  eliminarAnexo(id: number, anexoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/anexos/${anexoId}`, { headers: buildAuthHeaders() });
  }

  // ── Firmas (Elaborado por / Revisado por / Aprobado por) ────────────────────

  actualizarFirma(id: number, rol: string, req: ActualizarFirmaRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/firmas/${rol}`, req, { headers: buildAuthHeaders() });
  }

  subirFirma(id: number, rol: string, file: File): Observable<{ firmaUrl: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ firmaUrl: string }>(`${this.base}/${id}/firmas/${rol}/imagen`, fd, {
      headers: buildAuthHeaders(),
    });
  }

  // ── Exportar ──────────────────────────────────────────────────────────────

  exportarPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/exportar-pdf`, {
      headers: buildAuthHeaders(),
      responseType: 'blob',
    });
  }
}
