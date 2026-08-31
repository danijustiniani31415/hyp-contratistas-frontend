import { ResidentReportIncidenceDTO } from '../../../../core/dtos/reportResponseControl/residentReportIncidence.model';

/**
 * Cálculo único del "tiempo transcurrido" de una incidencia, compartido por las tres
 * vistas (tarjetas, tabla y modal de detalle). Vive acá y no en cada componente para
 * que el umbral de urgencia sea un solo número en todo el módulo.
 *
 * Regla: el color de urgencia SOLO aplica a incidencias NO LEVANTADAS. Una incidencia
 * levantada ya no acumula urgencia — su barra queda vacía/gris y su texto en muted.
 */

/** Paleta de urgencia (DESIGN-VICTOR §2.1 / §6.4). */
export const URGENCIA_VERDE = '#1B6B3A';
export const URGENCIA_NARANJA = '#D97706';
export const URGENCIA_ROJO = '#C0392B';
/** Texto/relleno neutro cuando la incidencia ya fue levantada. */
export const URGENCIA_MUTED = '#94A3B8';
/** Fondo del riel de la barra (DESIGN-VICTOR §6.5: "sin datos" = gris vacío). */
export const URGENCIA_RIEL = '#E2E8F0';

/** Umbrales en días: hasta 7 verde, hasta 30 naranja, más de 30 rojo. */
const UMBRAL_VERDE = 7;
const UMBRAL_NARANJA = 30;

/**
 * Escala del relleno de la barra: a los 60 días la barra está llena. Es una
 * aproximación deliberada (no hay SLA formal por incidencia); si el negocio define
 * un plazo real, este es el único número que hay que cambiar.
 */
const ESCALA_DIAS = 60;

/** Relleno mínimo visible: una incidencia de hoy igual debe mostrar un tramo de color. */
const RELLENO_MINIMO = 4;

const MS_POR_DIA = 86_400_000;

/** stateId 5 = LEVANTADO, 6 = NO LEVANTADO (confirmado por backend). */
const STATE_ID_LEVANTADO = 5;

export interface ElapsedInfo {
  /** Días completos entre la fecha de registro y hoy. */
  dias: number;
  /** "Hoy" · "Hace 1 día" · "Hace 12 días" · "Hace 3 semanas" · "Hace 2 meses". */
  texto: string;
  /** Color de urgencia, o gris muted si ya está levantada. */
  color: string;
  /** Ancho del relleno de la barra en % (0 si está levantada). */
  porcentaje: number;
  /** NO LEVANTADO con más de 30 días — único caso que se pinta en rojo. */
  vencido: boolean;
  levantado: boolean;
}

type IncidenciaMinima = Pick<
  ResidentReportIncidenceDTO,
  'createdDateTime' | 'stateId' | 'stateDescription'
>;

/** Levantado por descripción (lo que ya usaban tabla y tarjetas) o por stateId. */
export function esLevantado(item: IncidenciaMinima): boolean {
  return (
    (item.stateDescription ?? '').trim().toUpperCase() === 'LEVANTADO' ||
    item.stateId === STATE_ID_LEVANTADO
  );
}

/** Días completos transcurridos desde la fecha de registro (comparando por día, no por hora). */
export function diasTranscurridos(createdDateTime: string): number {
  const inicio = new Date(createdDateTime);
  if (isNaN(inicio.getTime())) return 0;

  const desde = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime();
  const hoy = new Date();
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();

  return Math.max(0, Math.round((hasta - desde) / MS_POR_DIA));
}

/** Texto humano en la escala más natural: días → semanas → meses. */
export function textoTranscurrido(dias: number): string {
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Hace 1 día';
  if (dias < 7) return `Hace ${dias} días`;

  if (dias < 30) {
    const semanas = Math.floor(dias / 7);
    return semanas === 1 ? 'Hace 1 semana' : `Hace ${semanas} semanas`;
  }

  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'Hace 1 mes' : `Hace ${meses} meses`;
}

export function tiempoTranscurrido(item: IncidenciaMinima): ElapsedInfo {
  const dias = diasTranscurridos(item.createdDateTime);
  const levantado = esLevantado(item);
  const texto = textoTranscurrido(dias);

  // Ya levantada: sin urgencia. Barra vacía y texto en gris muted.
  if (levantado) {
    return { dias, texto, color: URGENCIA_MUTED, porcentaje: 0, vencido: false, levantado: true };
  }

  const color =
    dias <= UMBRAL_VERDE
      ? URGENCIA_VERDE
      : dias <= UMBRAL_NARANJA
        ? URGENCIA_NARANJA
        : URGENCIA_ROJO;

  const porcentaje = Math.max(RELLENO_MINIMO, Math.round(Math.min(dias / ESCALA_DIAS, 1) * 100));

  return { dias, texto, color, porcentaje, vencido: dias > UMBRAL_NARANJA, levantado: false };
}
