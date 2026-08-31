import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SALUD_OCUPACIONAL_BASE, buildAuthHeaders } from './http-base';
import {
  EmoCorreoAdicionalCreateDto,
  EmoCorreoDestinatarioUpdateDto,
  EmoCorreosConfigDto,
} from '../dtos/emo-configuracion.model';

/**
 * Configuración de EMOs → matriz de destinatarios de los 4 correos de EMO
 * (programación automática, programación manual, aceptada y rechazada por la
 * clínica), donde cada destinatario se prende/apaga por perfil de trabajador.
 */
@Injectable({ providedIn: 'root' })
export class EmoConfiguracionService {
  private readonly base = `${SALUD_OCUPACIONAL_BASE}/emos/configuracion`;

  constructor(private http: HttpClient) {}

  /** Perfiles y los 4 correos con su matriz completa, en una sola petición. */
  getCorreos(): Observable<EmoCorreosConfigDto> {
    return this.http.get<EmoCorreosConfigDto>(`${this.base}/correos`, {
      headers: buildAuthHeaders(),
    });
  }

  crearAdicional(dto: EmoCorreoAdicionalCreateDto): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(
      `${this.base}/correos/destinatarios`,
      dto,
      { headers: buildAuthHeaders() },
    );
  }

  actualizarDestinatario(
    id: number,
    dto: EmoCorreoDestinatarioUpdateDto,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/correos/destinatarios/${id}`,
      dto,
      { headers: buildAuthHeaders() },
    );
  }

  /** Prende o apaga una celda de la matriz (correo × perfil × destinatario). */
  setReglaActive(reglaId: number, active: boolean): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/correos/reglas/${reglaId}`,
      { active },
      { headers: buildAuthHeaders() },
    );
  }

  eliminarAdicional(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/correos/destinatarios/${id}`,
      { headers: buildAuthHeaders() },
    );
  }
}
