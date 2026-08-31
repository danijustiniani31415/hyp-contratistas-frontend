import { Pipe, PipeTransform } from '@angular/core';

/**
 * Suaviza texto en MAYÚSCULA TOTAL (ej. "HUAYTAN MILLER") a formato de nombre
 * propio ("Huaytan Miller"), más profesional en tablas. Si el texto ya viene
 * con mayúsculas/minúsculas mixtas se deja intacto (evita romper siglas).
 */
@Pipe({ name: 'titleCase', standalone: true })
export class TitleCasePipe implements PipeTransform {
  transform(text: unknown): string {
    if (text === null || text === undefined) return '';
    const value = String(text);
    if (!value) return value;
    const isAllCaps = value === value.toUpperCase() && value !== value.toLowerCase();
    if (!isAllCaps) return value;
    return value.toLowerCase().replace(/(^|[\s\-/])([a-záéíóúñ])/g, (_m, sep, c) => sep + c.toUpperCase());
  }
}
