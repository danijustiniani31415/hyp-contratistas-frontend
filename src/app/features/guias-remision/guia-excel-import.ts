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
    .replace(/[^a-z0-9\s/"]/g, ' ')
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

const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'y', 'en', 'por', 'un', 'una']);
const tokens = (s: string) => new Set(normalizar(s).split(' ').filter((t) => t.length > 1 && !PALABRAS_VACIAS.has(t)));

/**
 * Producto del catálogo que mejor coincide con la descripción (similitud por palabras).
 * Devuelve null si no hay una coincidencia clara: es mejor preguntar que adivinar mal.
 */
export function mejorCoincidencia(
  descripcionBase: string,
  productos: { id: number; nombre: string }[],
): number | null {
  const a = tokens(descripcionBase);
  if (!a.size) return null;
  let mejor: { id: number; score: number } | null = null;
  let empate = false;
  for (const p of productos) {
    const b = tokens(p.nombre);
    if (!b.size) continue;
    let inter = 0;
    a.forEach((t) => b.has(t) && inter++);
    const score = inter / (a.size + b.size - inter);
    if (!mejor || score > mejor.score) {
      mejor = { id: p.id, score };
      empate = false;
    } else if (score === mejor.score) {
      empate = true;
    }
  }
  return mejor && mejor.score >= 0.6 && !empate ? mejor.id : null;
}
