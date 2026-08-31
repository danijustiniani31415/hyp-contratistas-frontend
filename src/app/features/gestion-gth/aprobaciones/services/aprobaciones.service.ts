import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AprobacionDecision,
  AprobacionDecisionMasiva,
  AprobacionDecisionMasivaResult,
  AprobacionDecisionResult,
  AprobacionDetalle,
  AprobacionesPanel,
} from '../dtos/aprobaciones.dto';

/**
 * Pantalla «Aprobaciones» de Gerencia. Todos los endpoints son autenticados: la decisión ya no se
 * toma desde un enlace público con token, sino dentro de la app (el correo solo lleva hasta acá).
 */
@Injectable({ providedIn: 'root' })
export class AprobacionesService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/aprobacion-gerencia`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /** Tarjetas de resumen + pendientes e historial, en una sola petición. */
  getPanel(): Observable<AprobacionesPanel> {
    return this.http.get<AprobacionesPanel>(`${this.apiUrl}/bandeja`, { headers: this.headers });
  }

  /** Detalle de una solicitud (cabecera + vacantes) para el modal de decisión. */
  getDetalle(aprobacionId: number): Observable<AprobacionDetalle> {
    return this.http.get<AprobacionDetalle>(`${this.apiUrl}/${aprobacionId}`, {
      headers: this.headers,
    });
  }

  /** Registra la decisión: las aprobadas pasan a GTH, las rechazadas quedan cerradas. */
  decidir(aprobacionId: number, dto: AprobacionDecision): Observable<AprobacionDecisionResult> {
    return this.http.post<AprobacionDecisionResult>(`${this.apiUrl}/${aprobacionId}/decision`, dto, {
      headers: this.headers,
    });
  }

  /**
   * Registra la MISMA decisión sobre varias solicitudes seleccionadas en la lista (todas las
   * vacantes de cada una), en una sola petición. Responde 200 incluso si alguna no se pudo decidir:
   * esas vienen en `omitidas` con su motivo.
   */
  decidirMasivo(dto: AprobacionDecisionMasiva): Observable<AprobacionDecisionMasivaResult> {
    return this.http.post<AprobacionDecisionMasivaResult>(`${this.apiUrl}/decision-masiva`, dto, {
      headers: this.headers,
    });
  }
}
