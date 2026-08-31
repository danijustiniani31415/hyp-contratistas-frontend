import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  CatalogosAdminDto,
  CategoriaAdminDto,
  PuestoAdminDto,
  PuestosEliminarResultDto,
  PuestoTrabajadorDto,
  PuestoUpsertRequest,
} from '../dtos/categorias-puestos.dto';

@Injectable({ providedIn: 'root' })
export class CategoriasPuestosService {
  private base = `${environment.apiUrl}api/v1/habilitacion/catalogos`;

  constructor(private http: HttpClient) {}

  /** Carga inicial de la pantalla: categorías + puestos en una sola petición. */
  getInitialData(): Observable<CatalogosAdminDto> {
    return this.http.get<CatalogosAdminDto>(`${this.base}/admin`);
  }

  // ── Categorías ──────────────────────────────────────────────────────

  crearCategoria(nombre: string): Observable<CategoriaAdminDto> {
    return this.http.post<CategoriaAdminDto>(`${this.base}/categorias`, { nombre });
  }

  actualizarCategoria(id: number, nombre: string): Observable<CategoriaAdminDto> {
    return this.http.put<CategoriaAdminDto>(`${this.base}/categorias/${id}`, { nombre });
  }

  toggleCategoria(id: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/categorias/${id}/toggle`, { activo });
  }

  // ── Puestos ─────────────────────────────────────────────────────────

  /**
   * Trabajadores que usan el puesto, para el modal de detalle. Va aparte de la carga
   * inicial a propósito: un puesto puede tener cientos de fichas y el detalle casi nunca
   * se abre, así que se piden solo al hacer clic en la fila.
   */
  getTrabajadoresPorPuesto(puestoId: number): Observable<PuestoTrabajadorDto[]> {
    return this.http.get<PuestoTrabajadorDto[]>(`${this.base}/puestos/${puestoId}/trabajadores`);
  }

  crearPuesto(req: PuestoUpsertRequest): Observable<PuestoAdminDto> {
    return this.http.post<PuestoAdminDto>(`${this.base}/puestos`, req);
  }

  actualizarPuesto(id: number, req: PuestoUpsertRequest): Observable<PuestoAdminDto> {
    return this.http.put<PuestoAdminDto>(`${this.base}/puestos/${id}`, req);
  }

  togglePuesto(id: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/puestos/${id}/toggle`, { activo });
  }

  /** Soft delete. El backend lo rechaza con 400 si hay trabajadores usando el puesto. */
  eliminarPuesto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/puestos/${id}`);
  }

  /**
   * Soft delete de la selección completa en una sola petición (no un DELETE por fila).
   * Va por POST porque el lote viaja en el cuerpo. Los puestos que hayan quedado en uso
   * se omiten y vuelven contados en la respuesta.
   */
  eliminarPuestos(ids: number[]): Observable<PuestosEliminarResultDto> {
    return this.http.post<PuestosEliminarResultDto>(`${this.base}/puestos/eliminar`, { ids });
  }
}
