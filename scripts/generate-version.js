// Genera dist/Abril/browser/version.json al final del build.
// El frontend lo consulta periódicamente para detectar nuevas versiones.

const fs = require('fs');
const path = require('path');

const outputDir = path.resolve(__dirname, '..', 'dist', 'Abril', 'browser');
const outputFile = path.join(outputDir, 'version.json');

if (!fs.existsSync(outputDir)) {
  console.error(`[generate-version] No existe ${outputDir}. ¿Corriste ng build antes?`);
  process.exit(1);
}

const payload = {
  hash: Date.now().toString(),
  builtAt: new Date().toISOString(),
};

fs.writeFileSync(outputFile, JSON.stringify(payload));
console.log(`[generate-version] ${outputFile} -> ${payload.hash}`);
