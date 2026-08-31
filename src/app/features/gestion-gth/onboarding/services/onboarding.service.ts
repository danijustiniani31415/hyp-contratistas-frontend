import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  BandejaOnboarding,
  OnboardingAccionResult,
  OnboardingCreate,
  OnboardingCreateResult,
} from '../dtos/onboarding.dto';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/gestion-gth/onboarding`;

  constructor(private http: HttpClient) {}

  private get headers() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Bandeja de Onboarding: resumen, fases, colaboradores ingresados y los candidatos aptos del
   * modal «Nuevo ingreso», todo en una sola petición.
   */
  getBandeja(): Observable<BandejaOnboarding> {
    return this.http.get<BandejaOnboarding>(`${this.apiUrl}/bandeja`, { headers: this.headers });
  }

  /**
   * Inicia el onboarding de un colaborador (multipart): los datos en `data` y la carta oferta (PDF)
   * como archivo. El backend la guarda en su file de SharePoint, registra el proceso en la fase
   * «Carta oferta firmada» y le manda al colaborador un correo con el enlace donde la lee y la firma
   * en línea. La carta ya NO se envía adjunta.
   */
  iniciar(datos: OnboardingCreate, cartaOferta: File): Observable<OnboardingCreateResult> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(datos));
    formData.append('cartaOferta', cartaOferta, cartaOferta.name);

    return this.http.post<OnboardingCreateResult>(this.apiUrl, formData, { headers: this.headers });
  }

  /**
   * Reenvía al colaborador el correo con el enlace para firmar su carta oferta. `correo` solo se
   * manda si GTH lo corrigió; el token del enlace original se conserva.
   */
  reenviarEnlaceFirma(onboardingId: number, correo?: string | null): Observable<OnboardingAccionResult> {
    return this.http.post<OnboardingAccionResult>(
      `${this.apiUrl}/${onboardingId}/carta-oferta/reenviar`,
      { correo: correo ?? null },
      { headers: this.headers },
    );
  }

  /**
   * Adjunta la carta oferta que el colaborador devolvió firmada. Es la vía de RESPALDO: lo normal es
   * que la firme él mismo desde el enlace, pero se conserva para quien la firme en papel. El backend
   * la guarda en el file digital del onboarding — la carpeta «Carta Oferta Firmada» dentro del file
   * del colaborador — y la deja pendiente de aprobación.
   */
  subirCartaFirmada(onboardingId: number, archivo: File): Observable<OnboardingAccionResult> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);

    return this.http.post<OnboardingAccionResult>(
      `${this.apiUrl}/${onboardingId}/carta-firmada`,
      formData,
      { headers: this.headers },
    );
  }

  /** Aprueba la carta oferta firmada adjunta (primera actividad del checklist). */
  aprobarCartaFirmada(onboardingId: number): Observable<OnboardingAccionResult> {
    return this.http.post<OnboardingAccionResult>(
      `${this.apiUrl}/${onboardingId}/carta-firmada/aprobar`,
      {},
      { headers: this.headers },
    );
  }

  /** Avanza el onboarding a la fase siguiente del checklist. */
  avanzarFase(onboardingId: number): Observable<OnboardingAccionResult> {
    return this.http.post<OnboardingAccionResult>(
      `${this.apiUrl}/${onboardingId}/avanzar`,
      {},
      { headers: this.headers },
    );
  }
}
