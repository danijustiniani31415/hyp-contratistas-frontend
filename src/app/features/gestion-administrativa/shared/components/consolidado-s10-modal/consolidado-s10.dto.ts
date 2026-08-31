/** Ámbito al que se asocia el PDF Consolidado del S10. Debe coincidir con el enum del backend. */
export type ConsolidadoS10Ambito = 'Rendicion' | 'Solicitud';

/** Consolidado del S10 vigente de una salida rendida. */
export interface ConsolidadoS10Dto {
  id: number;
  /** "Rendicion" (cubre toda la planilla) | "Solicitud" (solo esa salida). */
  ambito: ConsolidadoS10Ambito;
  pdfUrl: string;
  pdfFilename: string;
  uploadedAt: string;
}
