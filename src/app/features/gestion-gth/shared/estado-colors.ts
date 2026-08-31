/**
 * Colores del badge de estado del pipeline de reclutamiento (una entrada por fase) y utilidades
 * de orden del pipeline. Compartido por las features del módulo que muestran el estado de un
 * requerimiento: la bandeja de GTH, su modal de detalle y la vista del solicitante (Solicitud de
 * Personal), para que el mismo estado se pinte igual en todas.
 */
/**
 * Orden del pipeline de reclutamiento (espejo de gth_estado_requerimiento.orden). Permite saber en
 * el frontend si un requerimiento ya alcanzó una fase sin traer el orden numérico del backend.
 *
 * RECHAZADO_GG queda FUERA a propósito: no es una fase del pipeline sino la salida terminal de una
 * vacante que Gerencia General no aprobó (nunca llega a GTH), así que no "alcanza" ninguna fase.
 */
const PIPELINE: string[] = [
  'NUEVO',
  'APROBACION_GG',
  'VALIDACION_GTH',
  'PUBLICACION',
  'LONG_LIST',
  'LONG_LIST_ENVIADA',
  'LONG_LIST_APROBADA',
  'ENTREVISTAS',
  'SELECCION_JEFATURA',
  'EMO_INGRESO',
  // Las cuatro fases de resultado del examen. Van acá y no fuera del pipeline (como RECHAZADO_GG)
  // porque el requerimiento SÍ recorrió todas las fases anteriores: sacarlas de la lista haría que
  // `faseAlcanzada` dijera que no llegó a ninguna y el detalle escondería todas sus secciones justo
  // cuando GTH tiene que decidir qué hacer con el resultado.
  'EMO_OBSERVADO',
  'EMO_NO_APTO',
  'EMO_APTO',
  'EMO_APTO_RESTRICCIONES',
  'CERRADO',
  // El proceso terminó sin cubrir la vacante (ingreso directo FFT que salió No Apto en el EMO).
  // Va junto a CERRADO porque también recorrió todo el pipeline; es un estado aparte para que no
  // se cuente como un cierre exitoso.
  'CERRADO_SIN_CUBRIR',
];

/** true si el estado actual ya alcanzó (o superó) la fase indicada del pipeline. */
export function faseAlcanzada(estadoCodigo: string, fase: string): boolean {
  const actual = PIPELINE.indexOf(estadoCodigo);
  const objetivo = PIPELINE.indexOf(fase);
  return actual >= 0 && objetivo >= 0 && actual >= objetivo;
}

export function estadoColors(codigo: string): { bg: string; text: string } {
  switch (codigo) {
    case 'NUEVO':              return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'APROBACION_GG':      return { bg: '#FEF3C7', text: '#B45309' };
    case 'RECHAZADO_GG':       return { bg: '#FEE2E2', text: '#B91C1C' };
    case 'VALIDACION_GTH':     return { bg: '#E0E7FF', text: '#4338CA' };
    case 'PUBLICACION':        return { bg: '#CCFBF1', text: '#0F766E' };
    case 'LONG_LIST':          return { bg: '#F3E8FF', text: '#7E22CE' };
    case 'LONG_LIST_ENVIADA':  return { bg: '#E0F2FE', text: '#0284C7' };
    case 'LONG_LIST_APROBADA': return { bg: '#DCFCE7', text: '#15803D' };
    case 'ENTREVISTAS':        return { bg: '#FCE7F3', text: '#BE185D' };
    case 'SELECCION_JEFATURA': return { bg: '#CFFAFE', text: '#0E7490' };
    case 'EMO_INGRESO':        return { bg: '#FEF9C3', text: '#A16207' };
    case 'EMO_APTO':           return { bg: '#DCFCE7', text: '#15803D' };
    case 'EMO_APTO_RESTRICCIONES': return { bg: '#DCFCE7', text: '#15803D' };
    case 'EMO_OBSERVADO':      return { bg: '#FFEDD5', text: '#C2410C' };
    case 'EMO_NO_APTO':        return { bg: '#FEE2E2', text: '#B91C1C' };
    case 'CERRADO':            return { bg: '#E0E7FF', text: '#3730A3' };
    case 'CERRADO_SIN_CUBRIR': return { bg: '#F3F4F6', text: '#4B5563' };
    default:                   return { bg: '#F3F4F6', text: '#374151' };
  }
}
