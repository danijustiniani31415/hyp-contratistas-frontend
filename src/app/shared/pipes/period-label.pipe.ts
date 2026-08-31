import { Pipe, PipeTransform } from '@angular/core';

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Convierte un período a "Mes Año" en español. Acepta:
 *   • string "MM-yyyy"  → ej. "04-2026" → "Abril 2026"
 *   • Date              → usa mes/año locales (mismo criterio que el resto de la app)
 *   • string ISO/fecha parseable como respaldo
 * Devuelve el valor original si no se puede interpretar.
 */
export function formatPeriodLabel(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  let month1to12: number;
  let year: number;

  if (value instanceof Date) {
    month1to12 = value.getMonth() + 1;
    year = value.getFullYear();
  } else {
    const s = String(value).trim();
    const mmYyyy = /^(\d{1,2})-(\d{4})$/.exec(s);
    if (mmYyyy) {
      month1to12 = parseInt(mmYyyy[1], 10);
      year = parseInt(mmYyyy[2], 10);
    } else {
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      month1to12 = d.getMonth() + 1;
      year = d.getFullYear();
    }
  }

  if (month1to12 < 1 || month1to12 > 12) return String(value);
  return `${MESES_ES[month1to12 - 1]} ${year}`;
}

/** Muestra un período "MM-yyyy" (o Date) como "Mes Año" en español, ej. "Abril 2026". */
@Pipe({ name: 'periodLabel', standalone: true })
export class PeriodLabelPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatPeriodLabel(value);
  }
}
