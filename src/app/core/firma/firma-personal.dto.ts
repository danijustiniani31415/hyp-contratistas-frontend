/**
 * Firma personal del usuario logueado. Es UNA sola por persona (`person.signature_*`): la misma
 * que se estampa en las facturas de Contabilidad, en la carta oferta de Onboarding y en la
 * planilla de rendición de Gestión Administrativa. Da igual desde qué pantalla se registre.
 */
export interface FirmaPersonalDto {
  /** data:image/png;base64,… para usar directamente en un <img src>. */
  imageDataUrl: string;
  updatedDateTime?: string | null;
}
