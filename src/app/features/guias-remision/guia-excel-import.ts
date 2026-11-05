import * as XLSX from 'xlsx';

export interface FilaExcel {
  cantidad: number;
  descripcion: string;
}

/** Minúsculas, sin tildes ni signos: para comparar nombres escritos de formas distintas. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Medidas: «24"», «24 pulgadas» y «24pulg» son lo mismo; «72 mm» y «72mm» también.
    .replace(/(\d)\s*(?:"|''|pulgadas?\b|pulg\.?(?=\s|$)|in\b)/g, '$1pulg')
    .replace(/(\d)\s+(mm|cm|mts?|m|kgs?|lts?|l|gal|gln|gl|pies|pie|v|w|hp|psi)\b/g, '$1$2')
    .replace(/(\d)(mts|mt)\b/g, '$1m')
    .replace(/(\d)kgs\b/g, '$1kg')
    .replace(/(\d)(lts|lt)\b/g, '$1l')
    .replace(/(\d)(gln|gl)\b/g, '$1gal')
    .replace(/[^a-z0-9\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ES_CANTIDAD = (v: unknown) => typeof v === 'number' && v > 0 && Number.isFinite(v);
const ES_TEXTO = (v: unknown) => typeof v === 'string' && /[a-zA-Z]{2,}/.test(v);

/**
 * Lee la primera hoja y devuelve (cantidad, descripción). Tolera títulos arriba, una columna vacía
 * al inicio y encabezados "CANTIDAD / PRODUCTO". Las filas con la misma descripción se suman.
 */
export function leerExcel(buffer: ArrayBuffer): FilaExcel[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: true, defval: null });

  let colCant = -1;
  let colDesc = -1;
  for (const fila of filas) {
    const norm = fila.map((c) => (typeof c === 'string' ? normalizar(c) : ''));
    const ic = norm.findIndex((c) => c.includes('cantidad') || c === 'cant');
    const id = norm.findIndex((c) => c.includes('producto') || c.includes('descripcion') || c.includes('detalle'));
    if (ic >= 0 && id >= 0) {
      colCant = ic;
      colDesc = id;
      break;
    }
  }

  const acumulado = new Map<string, FilaExcel>();
  for (const fila of filas) {
    let cantidad: unknown;
    let descripcion: unknown;
    if (colCant >= 0) {
      cantidad = fila[colCant];
      descripcion = fila[colDesc];
    } else {
      cantidad = fila.find(ES_CANTIDAD);
      descripcion = fila.find(ES_TEXTO);
    }
    // Las cantidades pegadas como texto ("12") también valen.
    if (typeof cantidad === 'string' && /^\s*\d+([.,]\d+)?\s*$/.test(cantidad)) cantidad = Number(cantidad.replace(',', '.'));
    if (!ES_CANTIDAD(cantidad) || typeof descripcion !== 'string' || !descripcion.trim()) continue;

    const desc = descripcion.replace(/\s+/g, ' ').trim();
    const clave = normalizar(desc);
    const previa = acumulado.get(clave);
    if (previa) previa.cantidad += cantidad as number;
    else acumulado.set(clave, { cantidad: cantidad as number, descripcion: desc });
  }
  return [...acumulado.values()];
}

/** Separa la talla escrita en el texto ("... T/39", "TALLA M") de la descripción del producto. */
export function extraerTalla(descripcion: string): { base: string; talla: string } {
  const patrones = [
    /\bT\s*\/\s*(\d{1,2}|XXXL|XXL|XL|XS|S|M|L)\b/i,
    /\bTALLA\s*[:\-]?\s*(\d{1,2}|XXXL|XXL|XL|XS|S|M|L)\b/i,
  ];
  for (const p of patrones) {
    const m = descripcion.match(p);
    if (m) {
      const talla = m[1].toUpperCase().replace(/^0+(\d)/, '$1');
      return { base: descripcion.replace(m[0], ' ').replace(/\s+/g, ' ').trim(), talla };
    }
  }
  return { base: descripcion, talla: '' };
}

/** Unidad de medida probable: calzado y guantes se cuentan por par, el resto por unidad. */
export function adivinarUnidad(nombre: string): string {
  return /\b(bota|botas|guante|guantes|zapato|zapatos|zapatilla)\b/i.test(normalizar(nombre)) ? 'PAR' : 'UND';
}

/**
 * Catálogo de tallas que corresponde: calzado y guantes tienen el suyo; el resto usa ROPA.
 * Devuelve '' si el texto no trae talla (el producto no la necesita).
 */
export function adivinarTipoTalla(nombre: string, talla: string): '' | 'ROPA' | 'CALZADO' | 'GUANTES' {
  if (!talla) return '';
  const n = normalizar(nombre);
  if (/\b(bota|botas|zapato|zapatos|zapatilla)\b/.test(n)) return 'CALZADO';
  if (/\bguante|guantes\b/.test(n)) return 'GUANTES';
  return 'ROPA';
}

// «original» / «genuino» no distinguen un producto de otro: describen que es de la marca, no qué es.
const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'y', 'en', 'por', 'un', 'una', 'original', 'originales', 'genuino', 'genuina']);
const singular = (t: string) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t);
export const tokens = (s: string): string[] =>
  normalizar(s).split(' ').filter((t) => t.length > 1 && !PALABRAS_VACIAS.has(t)).map(singular);

export function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return fila[b.length];
}

/** Dos palabras iguales, o casi (una letra de diferencia) si son largas y sin números: «segusa»/«segusaa». */
export function palabrasIguales(a: string, b: string): boolean {
  if (a === b) return true;
  if (/\d/.test(a) || /\d/.test(b)) return false; // «34mm» y «36mm» son medidas distintas, no un error de tipeo
  return a.length >= 5 && b.length >= 5 && Math.abs(a.length - b.length) <= 1 && distancia(a, b) <= 1;
}

