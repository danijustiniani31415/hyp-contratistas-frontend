import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { MicrosoftAuthService } from '../../../auth/pages/login/services/microsoft-auth.service';

export interface FirmaElectronicaResult {
  pinFirma: string;
  microsoftAccessToken: string;
}

/**
 * Orquesta el paso de firma electrónica de una convalidación: pide el PIN del médico y
 * fuerza una reautenticación fresca de Microsoft (prompt=login). El backend vuelve a
 * validar ambos — esto solo evita que el médico llegue al submit sin haber completado
 * el paso de firma.
 */
@Injectable({ providedIn: 'root' })
export class FirmaElectronicaService {
  constructor(private microsoftAuth: MicrosoftAuthService) {}

  async solicitarFirma(medicoNombre: string): Promise<FirmaElectronicaResult | null> {
    const { value: pin } = await Swal.fire({
      icon: 'info',
      title: 'Firma electrónica',
      html: `Ingresa el PIN de firma de <b>${medicoNombre}</b> para autorizar esta convalidación.`,
      input: 'password',
      inputPlaceholder: 'PIN de firma',
      inputAttributes: { maxlength: '10', autocapitalize: 'off', autocorrect: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (!value ? 'Ingresa el PIN de firma.' : undefined),
    });
    if (!pin) return null;

    Swal.fire({
      title: 'Reautenticando con Microsoft…',
      text: 'Confirma tu cuenta en la ventana emergente para completar la firma.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const microsoftAccessToken = await this.microsoftAuth.getFreshSignatureToken();
      Swal.close();
      return { pinFirma: pin, microsoftAccessToken };
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo firmar',
        text: err?.message ?? 'No se pudo reautenticar con Microsoft.',
      });
      return null;
    }
  }
}
