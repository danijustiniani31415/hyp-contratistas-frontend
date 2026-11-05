/**
 * Nombres de distrito/provincia/departamento de los ubigeos que usa la empresa (Lima Metropolitana y la
 * provincia de Caravelí, Arequipa) para que la guía impresa diga «ATE - LIMA - LIMA» y no «ubigeo 150103».
 * Si un ubigeo no está acá, el PDF cae al código; se agrega una línea y listo.
 */
const LIMA = [
  'LIMA', 'ANCÓN', 'ATE', 'BARRANCO', 'BREÑA', 'CARABAYLLO', 'CHACLACAYO', 'CHORRILLOS', 'CIENEGUILLA', 'COMAS',
  'EL AGUSTINO', 'INDEPENDENCIA', 'JESÚS MARÍA', 'LA MOLINA', 'LA VICTORIA', 'LINCE', 'LOS OLIVOS', 'LURIGANCHO',
  'LURÍN', 'MAGDALENA DEL MAR', 'PUEBLO LIBRE', 'MIRAFLORES', 'PACHACÁMAC', 'PUCUSANA', 'PUENTE PIEDRA',
  'PUNTA HERMOSA', 'PUNTA NEGRA', 'RÍMAC', 'SAN BARTOLO', 'SAN BORJA', 'SAN ISIDRO', 'SAN JUAN DE LURIGANCHO',
  'SAN JUAN DE MIRAFLORES', 'SAN LUIS', 'SAN MARTÍN DE PORRES', 'SAN MIGUEL', 'SANTA ANITA', 'SANTA MARÍA DEL MAR',
  'SANTA ROSA', 'SANTIAGO DE SURCO', 'SURQUILLO', 'VILLA EL SALVADOR', 'VILLA MARÍA DEL TRIUNFO',
];

const CARAVELI = [
  'CARAVELÍ', 'ACARÍ', 'ATICO', 'ATIQUIPA', 'BELLA UNIÓN', 'CAHUACHO', 'CHALA', 'CHAPARRA', 'HUANUHUANU', 'JAQUÍ',
  'LOMAS', 'QUICACHA', 'YAUCA',
];

const UBIGEOS: Record<string, string> = {};
LIMA.forEach((d, i) => (UBIGEOS[`1501${String(i + 1).padStart(2, '0')}`] = `${d} - LIMA - LIMA`));
CARAVELI.forEach((d, i) => (UBIGEOS[`0403${String(i + 1).padStart(2, '0')}`] = `${d} - CARAVELÍ - AREQUIPA`));

/** «DISTRITO - PROVINCIA - DEPARTAMENTO» del ubigeo, o null si no está en la lista. */
export function nombreUbigeo(codigo: string | null | undefined): string | null {
  return codigo ? UBIGEOS[codigo.trim()] ?? null : null;
}
