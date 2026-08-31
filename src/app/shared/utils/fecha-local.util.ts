/**
 * Fechas "de calendario" (sin hora ni zona) servidas por el backend como `DateOnly`,
 * que viajan en el JSON como `"2026-08-12"`.
 *
 * `new Date("2026-08-12")` NO sirve para estas: el estándar manda interpretar una cadena
 * solo-fecha como medianoche **UTC**, así que en Lima (UTC-5) se convierte en el 11 a las
 * 19:00 y toda la fecha se muestra un día antes. Ese fue un bug real en la lista de
 * Programaciones de Salud Ocupacional, que mostraba 11/08 donde la BD decía 2026-08-12.
 *
 * El pipe `date` de Angular no tiene el problema (trae su propio parser ISO y usa los
 * setters locales cuando la cadena no lleva zona horaria), así que en templates se puede
 * seguir usando `| date`. Estas funciones son para el código TypeScript.
 */

/** `yyyy-MM-dd` exacto: lo que produce un `DateOnly` del backend. */
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parsea una fecha del backend a `Date` local, sin corrimiento de día.
 *
 * Una cadena solo-fecha se ancla a medianoche local; cualquier otra (con hora y/o zona,
 * p.ej. un `DateTimeOffset`) se deja pasar tal cual a `new Date`, que ya la interpreta
 * bien — ahí sí queremos la conversión a la zona del navegador, porque es un instante.
 */
export function parseFechaLocal(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  const d = new Date(SOLO_FECHA.test(fecha) ? `${fecha}T00:00:00` : fecha);
  return isNaN(d.getTime()) ? null : d;
}

/** Una `Date` como `yyyy-MM-dd` leyendo sus componentes **locales**. */
export function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Hoy como `yyyy-MM-dd` en la zona del usuario.
 *
 * Reemplaza a `new Date().toISOString().split('T')[0]`, que devuelve el día **en UTC**:
 * entre las 19:00 y las 23:59 de Lima eso ya es mañana, y una agenda "de hoy" filtrada
 * así se salta al día siguiente a partir de las 7pm.
 */
export function hoyIsoLocal(): string {
  return toIsoLocal(new Date());
}
