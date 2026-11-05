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

const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'para', 'con', 'y', 'en', 'por', 'un', 'una']);
const singular = (t: string) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t);
const tokens = (s: string): string[] =>
  normalizar(s).split(' ').filter((t) => t.length > 1 && !PALABRAS_VACIAS.has(t)).map(singular);

function distancia(a: string, b: string): number {
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
function palabrasIguales(a: string, b: string): boolean {
  if (a === b) return true;
  if (/\d/.test(a) || /\d/.test(b)) return false; // «34mm» y «36mm» son medidas distintas, no un error de tipeo
  return a.length >= 5 && b.length >= 5 && Math.abs(a.length - b.length) <= 1 && distancia(a, b) <= 1;
}

export interface CoincidenciaProducto {
  /** Producto cuyo nombre es el mismo (ignorando mayúsculas, tildes, plurales y orden): se asigna solo. */
  exacto: number | null;
  /** Producto parecido pero no igual: solo se sugiere, lo confirma una persona. */
  sugerido: { id: number; nombre: string; porcentaje: number } | null;
}

/**
 * Busca en el catálogo el producto de una descripción del Excel.
 *
 * Criterio deliberadamente prudente: una marca o medida distinta es OTRO producto con su propio stock
 * («bota de jebe punta de acero» y «bota de jebe segusa punta de acero» no son lo mismo), así que solo
 * se asigna automáticamente un nombre idéntico; lo parecido o con errores de tipeo se sugiere.
 */
export function buscarProducto(descripcionBase: string, productos: { id: number; nombre: string }[]): CoincidenciaProducto {
  const a = tokens(descripcionBase);
  if (!a.length) return { exacto: null, sugerido: null };

  const exactos: number[] = [];
  let mejor: { id: number; nombre: string; score: number } | null = null;
  let empate = false;

  const conNumero = (ts: string[]) => ts.filter((t) => /\d/.test(t)).sort().join('|');
  const pegado = (s: string) => normalizar(s).replace(/\s+/g, '');
  const aPegado = pegado(descripcionBase);

  for (const p of productos) {
    const b = tokens(p.nombre);
    if (!b.length) continue;
    // Medidas distintas («34mm» / «36mm», «1/2"» / «3/4"») son productos distintos: ni se sugieren.
    if (conNumero(a) !== conNumero(b)) continue;

    // Cada palabra de la descripción se empareja con a lo sumo una del producto.
    const libres = [...b];
    let coinciden = 0;
    let identicas = 0;
    for (const t of a) {
      const i = libres.findIndex((u) => u === t);
      if (i >= 0) {
        libres.splice(i, 1);
        coinciden++;
        identicas++;
        continue;
      }
      const j = libres.findIndex((u) => palabrasIguales(t, u));
      if (j >= 0) {
        libres.splice(j, 1);
        coinciden++;
      }
    }

    if (identicas === a.length && a.length === b.length) {
      exactos.push(p.id);
      continue;
    }
    // Segunda señal: el texto completo sin espacios, para errores de espaciado o tipeo («botad ejebe»).
    const bPegado = pegado(p.nombre);
    const parecido = 1 - distancia(aPegado, bPegado) / Math.max(aPegado.length, bPegado.length, 1);
    const score = Math.max(coinciden / (a.length + b.length - coinciden), parecido >= 0.85 ? parecido : 0);
    if (!mejor || score > mejor.score) {
      mejor = { id: p.id, nombre: p.nombre, score };
      empate = false;
    } else if (score === mejor.score) {
      empate = true;
    }
  }

  if (exactos.length === 1) return { exacto: exactos[0], sugerido: null };
  if (exactos.length > 1) return { exacto: null, sugerido: null }; // nombres repetidos en el catálogo: que elija una persona
  return {
    exacto: null,
    sugerido: mejor && mejor.score >= 0.6 && !empate
      ? { id: mejor.id, nombre: mejor.nombre, porcentaje: Math.round(mejor.score * 100) }
      : null,
  };
}
