import { distancia, normalizar, palabrasIguales, tokens } from './guia-excel-import';

/**
 * Marcas que se reconocen aunque ningún producto las tenga todavía. Además se reconocen todas las marcas
 * que ya existan en el catálogo, así que esta lista solo ayuda en la primera carga.
 */
export const MARCAS_FRECUENTES = ['Stanley', 'Truper', 'Kamasa', 'Tramontina', 'Artesco', '3M', 'MSA', 'Showa', 'Segusa', 'Hyundai'];

export interface ProductoParaCoincidir {
  id: number;
  nombre: string;
  marca?: string | null;
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Marcas reconocibles: las frecuentes más las que ya tienen los productos del catálogo (sin repetir). */
export function marcasConocidas(productos: { marca?: string | null }[]): string[] {
  const porNombre = new Map<string, string>();
  for (const m of [...MARCAS_FRECUENTES, ...productos.map((p) => p.marca ?? '')]) {
    const limpia = m.trim();
    if (limpia && !porNombre.has(normalizar(limpia))) porNombre.set(normalizar(limpia), limpia);
  }
  return [...porNombre.values()];
}

/** Separa del texto la marca conocida (si aparece como palabra completa) y devuelve el resto del nombre. */
export function separarMarca(texto: string, conocidas: string[]): { marca: string; base: string } {
  for (const m of [...conocidas].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapar(m)}(?![\\p{L}\\p{N}])`, 'iu');
    if (re.test(texto)) return { marca: m, base: texto.replace(re, ' ').replace(/\s+/g, ' ').trim() };
  }
  return { marca: '', base: texto.trim() };
}

/**
 * Detecta en el texto UN color de la lista del sistema (rojo, roja, rojos…, «color amarillo») y lo separa del nombre.
 * Si aparecen varios colores es un pack («2 negros y 2 rojos»), no una variante: no se separa nada.
 */
export function separarColor(texto: string, colores: string[]): { color: string; base: string } {
  const hallados: { color: string; re: RegExp }[] = [];
  for (const c of colores) {
    const n = normalizar(c);
    if (!n) continue;
    const termina = /[oa]$/.test(n);
    const raiz = escapar(termina ? n.slice(0, -1) : n);
    const forma = termina ? `${raiz}[oa]s?` : `${raiz}(?:es)?`;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:color\\s+)?${forma}(?![\\p{L}\\p{N}])`, 'iu');
    if (re.test(texto)) hallados.push({ color: c, re });
  }
  if (hallados.length !== 1) return { color: '', base: texto.trim() };
  return { color: hallados[0].color, base: texto.replace(hallados[0].re, ' ').replace(/\s+/g, ' ').trim() };
}

export interface CoincidenciaProducto {
  /** Producto con el mismo nombre Y la misma marca (ignorando mayúsculas, tildes, plurales y orden): se asigna solo. */
  exacto: number | null;
  /**
   * Producto parecido: solo se sugiere, lo confirma una persona. `otraMarca` indica que el nombre coincide
   * pero la marca no (o uno de los dos no tiene), que es otro producto con su propio stock.
   */
  sugerido: { id: number; nombre: string; porcentaje: number; otraMarca: boolean; alternativas: string[] } | null;
}

/**
 * Busca en el catálogo el producto de una fila del Excel, considerando la marca como dato propio.
 *
 * Es prudente a propósito: una marca o medida distinta es OTRO producto, así que solo se asigna sola una
 * coincidencia exacta en nombre y marca; lo parecido, con errores de tipeo o de otra marca se sugiere.
 * `base` es el nombre SIN la marca (ver separarMarca).
 */
export function buscarProducto(
  base: string,
  marca: string,
  productos: ProductoParaCoincidir[],
  conocidas: string[],
): CoincidenciaProducto {
  const a = tokens(base);
  if (!a.length) return { exacto: null, sugerido: null };

  const marcaA = normalizar(marca);
  const conNumero = (ts: string[]) => ts.filter((t) => /\d/.test(t)).sort().join('|');
  const pegado = (s: string) => normalizar(s).replace(/\s+/g, '');
  const aPegado = pegado(base);

  const exactos: { id: number; nombre: string }[] = [];
  // `as` evita que TypeScript fije el tipo en `null` y lo deje en `never` dentro del bucle.
  let mejor = null as { id: number; nombre: string; score: number; otraMarca: boolean } | null;
  // Otros productos igual de parecidos (catálogo con duplicados: «ARCO DE SIERRA» y «ARCO SIERRA»): se muestran
  // todos para que una persona elija, en vez de callarse por el empate.
  let alternativas: string[] = [];

  for (const p of productos) {
    // Marca del producto: la de su campo o, si es un producto anterior al campo, la que se detecte en su nombre.
    const propia = (p.marca ?? '').trim();
    const sep = propia ? separarMarca(p.nombre, [propia]) : separarMarca(p.nombre, conocidas);
    const marcaP = normalizar(propia || sep.marca);
    const b = tokens(sep.base);
    if (!b.length) continue;
    // Medidas distintas («34mm» / «36mm», «1/2"» / «3/4"») son productos distintos: ni se sugieren.
    if (conNumero(a) !== conNumero(b)) continue;

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

    const mismaMarca = marcaA === marcaP;
    if (identicas === a.length && a.length === b.length) {
      if (mismaMarca) {
        exactos.push({ id: p.id, nombre: p.nombre });
        continue;
      }
    }

    // Segunda señal: el texto completo sin espacios, para errores de espaciado o tipeo («botad ejebe»).
    const parecido = 1 - distancia(aPegado, pegado(sep.base)) / Math.max(aPegado.length, pegado(sep.base).length, 1);
    let score = Math.max(coinciden / (a.length + b.length - coinciden), parecido >= 0.85 ? parecido : 0);
    if (!mismaMarca) score = Math.min(score, 0.99);
    // A igual parecido gana el de la misma marca: la marca desempata. Solo es empate real si coinciden ambas cosas.
    const actual: { id: number; nombre: string; score: number; otraMarca: boolean } | null = mejor;
    if (
      !actual
      || (mismaMarca && actual.otraMarca)
      || (mismaMarca === !actual.otraMarca && score > actual.score)
    ) {
      mejor = { id: p.id, nombre: p.nombre, score, otraMarca: !mismaMarca };
      alternativas = [];
    } else if (mismaMarca === !actual.otraMarca && score === actual.score) {
      alternativas.push(p.nombre);
    }
  }

  if (exactos.length === 1) return { exacto: exactos[0].id, sugerido: null };
  if (exactos.length > 1) {
    // Catálogo con el mismo producto repetido («ARCO DE SIERRA» / «ARCO SIERRA»): no se elige solo, se muestran todos.
    return {
      exacto: null,
      sugerido: { id: exactos[0].id, nombre: exactos[0].nombre, porcentaje: 100, otraMarca: false, alternativas: exactos.slice(1, 4).map((e) => e.nombre) },
    };
  }
  return {
    exacto: null,
    sugerido: mejor && mejor.score >= 0.6
      ? { id: mejor.id, nombre: mejor.nombre, porcentaje: Math.round(mejor.score * 100), otraMarca: mejor.otraMarca, alternativas: alternativas.slice(0, 3) }
      : null,
  };
}
