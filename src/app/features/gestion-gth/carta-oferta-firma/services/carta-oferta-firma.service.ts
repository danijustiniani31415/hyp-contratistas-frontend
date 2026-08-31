import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CartaOfertaFirmaGuardarResult,
  CartaOfertaFirmaPublico,
  CartaOfertaFirmarResult,
} from '../dtos/carta-oferta-firma.dto';

/**
 * Servicio de la página PÚBLICA de la carta oferta (acceso por token, sin login). Por eso no envía
 * el header Authorization: son endpoints [AllowAnonymous] del backend y el token del enlace es lo
 * único que autoriza cada llamada.
 */
@Injectable({ providedIn: 'root' })
export class CartaOfertaFirmaService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/carta-oferta-firma`;

  constructor(private http: HttpClient) {}

  /** Contexto de la página por token (propuesta + firma registrada + estado del documento). */
  getPublico(token: string): Observable<CartaOfertaFirmaPublico> {
    return this.http.get<CartaOfertaFirmaPublico>(`${this.apiUrl}/publico`, { params: { token } });
  }

  /**
   * PDF de la carta para el visor. Llega como blob: la página lo muestra desde un object URL, así el
   * postulante nunca ve la URL de SharePoint ni necesita acceso a la biblioteca.
   */
  getDocumento(token: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/publico/documento`, {
      params: { token },
      responseType: 'blob',
    });
  }

  /** Guarda la firma dibujada (data URL PNG del canvas) en la ficha del postulante. */
  guardarFirma(token: string, imageBase64: string): Observable<CartaOfertaFirmaGuardarResult> {
    return this.http.put<CartaOfertaFirmaGuardarResult>(
      `${this.apiUrl}/publico/firma`,
      { imageBase64 },
      { params: { token } },
    );
  }

  /** Firma la carta oferta: el backend estampa la firma registrada y guarda el documento. */
  firmar(token: string): Observable<CartaOfertaFirmarResult> {
    return this.http.post<CartaOfertaFirmarResult>(
      `${this.apiUrl}/publico/firmar`,
      {},
      { params: { token } },
    );
  }
}
