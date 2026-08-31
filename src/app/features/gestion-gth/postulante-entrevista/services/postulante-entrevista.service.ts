import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { EntrevistaRespuestaPublica, RespuestaEntrevista } from '../dtos/postulante-entrevista.dto';

/**
 * Servicio de la página PÚBLICA con la que el candidato confirma o rechaza su entrevista (acceso
 * por token, sin login). Por eso no envía el header Authorization: es un endpoint
 * `[AllowAnonymous]` del backend, igual que el del formulario del postulante.
 */
@Injectable({ providedIn: 'root' })
export class PostulanteEntrevistaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/entrevista`;

  constructor(private http: HttpClient) {}

  /**
   * Registra la respuesta del candidato y devuelve la cita para mostrársela. Va en POST y no en el
   * GET del enlace del correo porque los antivirus de correo siguen los GET de un mensaje: con la
   * acción en el GET, la entrevista quedaría respondida sin que el candidato pulsara nada.
   */
  responder(token: string, respuesta: RespuestaEntrevista): Observable<EntrevistaRespuestaPublica> {
    return this.http.post<EntrevistaRespuestaPublica>(
      `${this.apiUrl}/respuesta`,
      null,
      { params: { token, r: respuesta } },
    );
  }
}
