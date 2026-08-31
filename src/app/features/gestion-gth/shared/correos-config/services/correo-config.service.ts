import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  CorreoAdicionalCreate,
  CorreoAdicionalUpdate,
  CorreoConfig,
  CorreoConfigModulo,
} from '../dtos/correo-config.dto';

/**
 * Configuración de los correos de Gestión GTH: qué correos se envían, a quién y con qué
 * destinatarios activos. Los correos de los gerentes no se escriben acá, salen del dato maestro
 * del trabajador al momento de enviar.
 *
 * Todas las operaciones reciben el `modulo` porque hay tres pantallas con su propio juego de
 * correos —Solicitud de Personal, Aprobaciones y Reclutamiento— y el backend acota cada una a
 * los suyos.
 */
@Injectable({ providedIn: 'root' })
export class CorreoConfigService {
  constructor(private http: HttpClient) {}

  private base(modulo: CorreoConfigModulo): string {
    return `${environment.apiUrl}api/v1/gestion-gth/${modulo}/configuracion`;
  }

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Todos los correos de la pantalla con sus destinatarios, en una sola petición. */
  getCorreos(modulo: CorreoConfigModulo): Observable<CorreoConfig> {
    return this.http.get<CorreoConfig>(`${this.base(modulo)}/correos`, { headers: this.headers });
  }

  /** Prende o apaga un correo completo (interruptor maestro de la sección). */
  setCorreoActive(
    modulo: CorreoConfigModulo,
    codigo: string,
    active: boolean,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base(modulo)}/correos/${codigo}/active`,
      { active },
      { headers: this.headers },
    );
  }

  /**
   * Prende o apaga el destinatario principal que asigna el sistema (el solicitante, el postulante,
   * el candidato…). Va por el código del correo y no por un id de destinatario: ese destinatario
   * no es una fila de la tabla, es una propiedad del propio correo.
   */
  setPrincipalSistemaActive(
    modulo: CorreoConfigModulo,
    codigo: string,
    active: boolean,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base(modulo)}/correos/${codigo}/principal-automatico/active`,
      { active },
      { headers: this.headers },
    );
  }

  /** Prende o apaga un destinatario dentro de su correo. */
  setDestinatarioActive(
    modulo: CorreoConfigModulo,
    id: number,
    active: boolean,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base(modulo)}/correos/destinatarios/${id}/active`,
      { active },
      { headers: this.headers },
    );
  }

  crearAdicional(
    modulo: CorreoConfigModulo,
    dto: CorreoAdicionalCreate,
  ): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(
      `${this.base(modulo)}/correos/destinatarios`,
      dto,
      { headers: this.headers },
    );
  }

  actualizarAdicional(
    modulo: CorreoConfigModulo,
    id: number,
    dto: CorreoAdicionalUpdate,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base(modulo)}/correos/destinatarios/${id}`,
      dto,
      { headers: this.headers },
    );
  }

  eliminarAdicional(modulo: CorreoConfigModulo, id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base(modulo)}/correos/destinatarios/${id}`,
      { headers: this.headers },
    );
  }
}
