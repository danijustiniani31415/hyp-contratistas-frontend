// Bloquea dos patrones que ya causaron bugs reales en el pasado (ver CLAUDE.md):
// 1. <select> nativo en vez de app-search-select.
// 2. ::ng-deep fuera de shared/ para hackear el estilo de un componente compartido
//    (en vez de extender el input real, ej. badgeStyle).
//
// Va con `fs` y no con `grep` a propósito: en Windows `grep` no existe, el execSync
// tiraba error, el catch lo tomaba como "sin matches" y el script imprimía "OK" igual.
// Resultado: las violaciones recién aparecían en el runner Linux de CI y rompían el
// deploy después de pushear. Las rutas además se normalizan a "/" para que los
// allowlist de abajo comparen bien en Windows y en Linux.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'app');

const SELECT_ALLOWLIST = [
  'shared/components/app-generic-select/app-generic-select.component.html',
];

const NG_DEEP_ALLOWLIST_PREFIX = 'shared/';

/** Rutas de todos los archivos bajo ROOT, relativas a ROOT y siempre con "/". */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(path.relative(ROOT, full).split(path.sep).join('/'));
  }
  return out;
}

const ALL_FILES = walk(ROOT);

/** Archivos que terminan en alguno de `suffixes` y contienen `pattern` (texto literal). */
function findFiles(pattern, suffixes) {
  return ALL_FILES.filter(
    (f) =>
      suffixes.some((s) => f.endsWith(s)) &&
      fs.readFileSync(path.join(ROOT, f), 'utf8').includes(pattern),
  );
}

const selectViolations = findFiles('<select', ['.component.html']).filter(
  (f) => !SELECT_ALLOWLIST.includes(f),
);

const ngDeepViolations = findFiles('::ng-deep', ['.component.css', '.component.scss']).filter(
  (f) => !f.startsWith(NG_DEEP_ALLOWLIST_PREFIX),
);

let hasErrors = false;

if (selectViolations.length) {
  hasErrors = true;
  console.error('\n<select> nativo encontrado (usa app-search-select):');
  selectViolations.forEach((f) => console.error(`  - src/app/${f}`));
}

if (ngDeepViolations.length) {
  hasErrors = true;
  console.error('\n::ng-deep encontrado fuera de shared/ (extiende el componente compartido en vez de hackearlo):');
  ngDeepViolations.forEach((f) => console.error(`  - src/app/${f}`));
}

if (hasErrors) {
  console.error('\nVer convenciones de UI en CLAUDE.md antes de agregar excepciones.\n');
  process.exit(1);
}

console.log('lint-standards: OK');
