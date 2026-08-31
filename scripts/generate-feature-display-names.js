// Genera core/navigation/feature-display-names.generated.ts: un mapa
// featureKey -> nombre real ya usado en la app, para mostrar en el modal
// "Editar Rol" (security/roles) en vez de un nombre heurístico.
//
// Por qué existe: RoleEdit necesitaba traducir feature_key técnicos (ej.
// "projects.ivt-control") a texto legible. La primera versión los generaba con una
// heurística (humanizeFeatureKey) que no siempre coincidía con lo que el usuario ve
// en el sidebar (esa dio "IVT Control" en vez de "Control de IVTs"). En vez de mantener
// a mano un diccionario de 156 entradas que se desactualiza cada vez que se agrega una
// pantalla, este script recorre el código fuente (AST de TypeScript, no regex) y arma
// el mapa desde las DOS fuentes de verdad reales que ya existen:
//
//   1) navigation.service.ts — cada entrada `{ label, featureKey }` del sidebar
//      (prioridad alta: es literalmente lo que el usuario hace clic).
//   2) Cualquier route.data `{ titulo, featureKey }` del resto de *.routes.ts /
//      *-module.ts (prioridad baja, solo llena huecos que el sidebar no cubre —
//      ej. sub-pantallas sin entrada propia como "observaciones.lista"). Los titulo
//      vienen en MAYÚSCULAS por convención de la app, así que se normalizan a Title
//      Case acá (misma idea que shared/pipes/title-case.pipe.ts, duplicada a propósito:
//      este es un script Node plano, no vale la pena compilar TS solo para reusar 3
//      líneas).
//
// Lo que NO cubre ninguna de las dos fuentes (ej. permisos finos sin pantalla propia,
// o los feature_key sin route.data.titulo) se queda sin entrada acá — RoleEdit cae a
// humanizeFeatureKey() como último fallback para esos.
//
// Uso: node scripts/generate-feature-display-names.js
// Re-ejecutar a mano cuando se agregue una pantalla/featureKey nueva (mismo patrón
// manual que scripts/generate-email-icons.js).

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const SRC_DIR = path.join(__dirname, '..', 'src', 'app');
const NAV_SERVICE_FILE = path.join(SRC_DIR, 'core', 'navigation', 'navigation.service.ts');
const OUT_FILE = path.join(SRC_DIR, 'core', 'navigation', 'feature-display-names.generated.ts');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (
      entry.isFile() &&
      full.endsWith('.ts') &&
      !full.endsWith('.spec.ts') &&
      !full.endsWith('.generated.ts')
    ) {
      files.push(full);
    }
  }
  return files;
}

/** "ARQUITECTURA COMERCIAL - OBSERVACIONES - LISTA" -> "Arquitectura Comercial - Observaciones - Lista" */
function titleCaseIfAllCaps(value) {
  const isAllCaps = value === value.toUpperCase() && value !== value.toLowerCase();
  if (!isAllCaps) return value;
  return value
    .toLowerCase()
    .replace(/(^|[\s\-/])([a-záéíóúñ])/g, (_m, sep, c) => sep + c.toUpperCase());
}

function stringPropsOf(node, sourceFile) {
  const props = {};
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop) || !prop.name) continue;
    const name = prop.name.getText(sourceFile);
    if (ts.isStringLiteralLike(prop.initializer)) {
      props[name] = prop.initializer.text;
    }
  }
  return props;
}

function extractPairs(filePath, keyProp, valueProp) {
  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.includes(keyProp) || !text.includes(valueProp)) return [];

  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const pairs = [];

  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const props = stringPropsOf(node, source);
      if (props[keyProp] && props[valueProp]) {
        pairs.push([props[keyProp], props[valueProp]]);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return pairs;
}

// ── Fuente 1: navigation.service.ts (label del sidebar, prioridad alta) ──────
const navPairs = extractPairs(NAV_SERVICE_FILE, 'featureKey', 'label');
const map = new Map(navPairs);
console.log(`Fuente 1 (navigation.service.ts): ${navPairs.length} pares featureKey -> label.`);

// ── Fuente 2: route.data.titulo en el resto del código (prioridad baja) ─────
const allFiles = walk(SRC_DIR).filter((f) => f !== NAV_SERVICE_FILE);
let tier2Count = 0;
let skippedAlreadyInTier1 = 0;
const conflicts = [];
for (const file of allFiles) {
  for (const [featureKey, titulo] of extractPairs(file, 'featureKey', 'titulo')) {
    const label = titleCaseIfAllCaps(titulo);
    if (map.has(featureKey)) {
      if (navPairs.some(([k]) => k === featureKey)) {
        skippedAlreadyInTier1++;
      } else if (map.get(featureKey) !== label) {
        conflicts.push(
          `${featureKey}: "${map.get(featureKey)}" vs "${label}" (${path.relative(SRC_DIR, file)})`,
        );
      }
      continue;
    }
    map.set(featureKey, label);
    tier2Count++;
  }
}
console.log(`Fuente 2 (route.data.titulo): ${tier2Count} pares nuevos agregados.`);
console.log(`  (${skippedAlreadyInTier1} featureKey ya cubiertos por el sidebar, no se pisaron).`);
if (conflicts.length) {
  console.log(`  ${conflicts.length} conflicto(s) entre distintos titulo para el mismo featureKey (se conservó el primero):`);
  conflicts.forEach((c) => console.log(`    - ${c}`));
}

// ── Emitir ────────────────────────────────────────────────────────────────
const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));

const body = `// ARCHIVO GENERADO — no editar a mano.
// Fuente: node scripts/generate-feature-display-names.js (AST de TypeScript sobre
// navigation.service.ts + route.data.titulo de toda la app). Re-generar con ese
// comando cuando se agregue/renombre una pantalla con featureKey nuevo.
//
// Consumido por RoleEdit (security/roles) como fuente principal de nombres legibles
// para los 156+ featureKey del modal "Editar Rol" — humanizeFeatureKey() ahí mismo
// es solo el fallback para featureKey que no aparecen en ningún lado del frontend.

export const FEATURE_DISPLAY_NAMES: Record<string, string> = {
${sorted.map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};
`;

fs.writeFileSync(OUT_FILE, body, 'utf8');
console.log(`\nGenerado ${path.relative(process.cwd(), OUT_FILE)} con ${sorted.length} featureKey en total.`);
