/**
 * Historial de candidatos rechazados de un requerimiento. Vive acá porque lo usan dos features del
 * módulo, cada una en su propia pantalla del mismo dato: «Reclutamiento» (el detalle que ve GTH) y
 * «Solicitud de Personal» (el «Estado del reclutamiento» que ve el área solicitante).
 */

/** Etapa del proceso en la que se rechazó al candidato. */
export type EtapaRechazo =
  | 'LONG_LIST'
  | 'FORMULARIO'
  | 'ENTREVISTAS'
  | 'DECISION_FINAL'
  /** El seleccionado salió No Apto en su EMO de ingreso. Es la única de la que no se puede volver. */
  | 'EMO';

/** Quién tomó el rechazo: el área usuaria, GTH o el examen médico. */
export type RechazadoPor = 'SOLICITANTE' | 'GTH' | 'SALUD_OCUPACIONAL';

/**
 * Un candidato que quedó rechazado en algún punto del proceso, con la etapa del rechazo. Incluye
 * los de long lists anteriores: cuando el solicitante rechaza a todos, el requerimiento vuelve a
 * Long list y estos son los que hay que poder consultar para no volver a presentar a los mismos.
 */
export interface CandidatoRechazado {
  candidatoId: number;
  nombre: string;
  /** Puesto del requerimiento al cargar la long list (snapshot), no un dato por candidato. */
  puesto: string | null;
  /**
   * En qué long list del requerimiento estaba (1 = la primera). Sin esto, dos rechazados en la
   * etapa "Long list" de vueltas distintas se leen igual.
   */
  numeroLongList: number;
  etapaCodigo: EtapaRechazo;
  /** Nombre de la etapa ("Long list", "Formulario", "Entrevistas", "Decisión final", "EMO"). */
  etapaNombre: string;
  rechazadoPorCodigo: RechazadoPor;
  /** "Área solicitante" / "GTH" / "Salud Ocupacional". */
  rechazadoPorNombre: string;
  /**
   * true si GTH puede retomar el proceso con este candidato desde donde se lo rechazó. Lo son todos
   * menos los de la etapa 'EMO'. El botón, además, solo se muestra con el requerimiento en la fase
   * EMO_NO_APTO: este campo dice si el candidato es retomable, no si se puede retomar ahora.
   */
  puedeRetomar: boolean;
  /** Momento del rechazo (ISO, ya en hora Perú). */
  rechazadoEn: string;
  /** Comentario interno que GTH registró sobre el candidato al cargar la long list. */
  comentario: string | null;
  /** Nombre y link del CV en SharePoint (para volver a revisarlo desde el historial). */
  cvNombre: string | null;
  cvUrl: string | null;
}

/** Colores del badge de la etapa en la que se rechazó al candidato. */
export function etapaRechazoColors(codigo: string): { bg: string; text: string } {
  switch (codigo) {
    case 'LONG_LIST':      return { bg: '#F3E8FF', text: '#7E22CE' };
    case 'FORMULARIO':     return { bg: '#E0F2FE', text: '#0369A1' };
    case 'ENTREVISTAS':    return { bg: '#FCE7F3', text: '#BE185D' };
    case 'DECISION_FINAL': return { bg: '#FFEDD5', text: '#C2410C' };
    case 'EMO':            return { bg: '#FEE2E2', text: '#B91C1C' };
    default:               return { bg: '#F3F4F6', text: '#374151' };
  }
}
