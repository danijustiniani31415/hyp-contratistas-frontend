// Genera los PNG de los íconos de los correos (public/images/emails/icons/).
//
// Por qué existe este script y no se suben los PNG "a mano":
// - Los correos de Outlook no renderizan SVG y bloquean las imágenes en base64, así que cada
//   ícono tiene que ser un PNG hospedado. Este script es la única fuente de verdad de cómo se
//   ven: si mañana cambia el verde de la marca o el grosor del trazo, se edita acá y se
//   regeneran todos de una vez en lugar de reabrir 30 binarios.
// - Los íconos se sirven desde el frontend (public/), no desde el wwwroot del backend: en
//   producción nginx solo proxea /api/** al contenedor y cualquier otra ruta cae en el
//   fallback del SPA, que devuelve index.html en vez del PNG.
//
// Medidas calcadas de los íconos que ya existían (req-* y emo-*), no inventadas — se midieron
// pixel a pixel sobre req-area.png, req-vacantes.png y req-recordatorio.png:
// - viewBox 0 0 24 24 y stroke-width 1.3.
// - TODOS los íconos llevan el aro lima a sangre; el glifo va adentro y ocupa el 37.5% del
//   lienzo (de ahí ESCALA_GLIFO: los glifos se escriben a sangre y el script los reduce).
// - Fila de tarjeta: 56x56 (se muestra a 28px). Cabecera: 96x96 (se muestra a 44px).
//   Franja: 88x88, círculo relleno con el glifo en blanco (se muestra a 40px).
// - El aro y el círculo relleno van dibujados dentro del PNG y no con border-radius porque
//   Outlook de escritorio ignora border-radius y los dejaría cuadrados.
//
// Uso: node scripts/generate-email-icons.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'images', 'emails', 'icons');

const LIMA = '#64BC04'; // verde de la hoja del logo (--color-abril-lime)
const VERDE = '#15803D'; // verde de "aprobado"
const ROJO = '#B91C1C'; // rojo de "rechazado"
const AMBAR = '#B45309'; // ámbar de "observado" (el mismo de req-recordatorio)
const TEAL = '#0F6E56'; // verde de acción de la app (--color-abril-standard)

const TRAZO = 1.3;

/** Proporción del lienzo que ocupa el glifo dentro del aro (medida sobre los íconos existentes). */
const ESCALA_GLIFO = 0.46;

/** Estrella de 5 puntas centrada, para no escribir los 10 pares de puntas a mano. */
function estrella(cx, cy, rExt, rInt) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rExt : rInt;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `<path d="M${pts.join('L')}Z"/>`;
}

// ── Glifos, en coordenadas 0 0 24 24 ──────────────────────────────────────────
// Los de fila se dibujan a sangre; los de cabecera y franja se reescalan al centro del
// aro/círculo, así que se escriben igual y el script se encarga del transform.
const G = {
  // Fila de tarjeta
  codigo: '<path d="M9 2.5 6.5 21.5M17.5 2.5 15 21.5M3 8.5h18.5M2 15.5h18.5"/>',
  puesto:
    '<rect x="1.8" y="6.5" width="20.4" height="15.2" rx="2.4"/>' +
    '<path d="M8.4 6.5V4.6a2.1 2.1 0 0 1 2.1-2.1h3a2.1 2.1 0 0 1 2.1 2.1v1.9"/>' +
    '<path d="M1.8 12.8h20.4"/>',
  proyecto:
    '<rect x="3.2" y="2.2" width="17.6" height="19.6" rx="1.8"/>' +
    '<path d="M7.6 6.6h2.2M14.2 6.6h2.2M7.6 10.8h2.2M14.2 10.8h2.2M7.6 15h2.2M14.2 15h2.2"/>' +
    '<path d="M9.8 21.8v-3.4h4.4v3.4"/>',
  fecha:
    '<rect x="2.2" y="4.4" width="19.6" height="17.4" rx="2.2"/>' +
    '<path d="M2.2 9.6h19.6M7.4 2.2v4.4M16.6 2.2v4.4"/>' +
    '<path d="M6.8 13.6h2.2M10.9 13.6h2.2M15 13.6h2.2M6.8 17.6h2.2M10.9 17.6h2.2"/>',
  hora: '<circle cx="12" cy="12" r="9.8"/><path d="M12 6.2V12l4.2 2.6"/>',
  lugar:
    '<path d="M12 22.2c4.6-4.7 8-8.4 8-12.2a8 8 0 1 0-16 0c0 3.8 3.4 7.5 8 12.2Z"/>' +
    '<circle cx="12" cy="9.8" r="3.1"/>',
  candidato:
    '<circle cx="9" cy="6.8" r="4.6"/>' +
    '<path d="M1.8 21.8v-1.4a5.2 5.2 0 0 1 5.2-5.2h3.4"/>' +
    estrella(17.2, 16.6, 5.4, 2.4),
  candidatos:
    '<circle cx="8.2" cy="6.9" r="4.6"/>' +
    '<path d="M1.6 21.8v-1.6a5.2 5.2 0 0 1 5.2-5.2h2.8a5.2 5.2 0 0 1 5.2 5.2v1.6"/>' +
    '<path d="M16.6 2.8a4.6 4.6 0 0 1 0 8.6"/>' +
    '<path d="M18.2 15.2a5.2 5.2 0 0 1 4.2 5.1v1.5"/>',
  correo:
    '<rect x="1.8" y="4.2" width="20.4" height="15.6" rx="2.6"/>' +
    '<path d="M2.8 6.2 12 13l9.2-6.8"/>',
  celular:
    '<rect x="5.6" y="1.6" width="12.8" height="20.8" rx="2.6"/>' +
    '<path d="M10.4 4.8h3.2M10.2 18.9h3.6"/>',
  estado: '<path d="M4.4 22.4V1.8"/><path d="M4.4 3h15.2l-3.2 5 3.2 5H4.4"/>',
  comentario:
    '<path d="M2 5.4a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v8.4a3 3 0 0 1-3 3H9.2l-5.6 4.6v-4.8a3 3 0 0 1-1.6-2.8Z"/>' +
    '<path d="M6.8 7.6h10.4M6.8 11.6h6.4"/>',
  vistobueno:
    '<circle cx="9.4" cy="6.8" r="4.6"/>' +
    '<path d="M1.8 21.8v-1.4a5.2 5.2 0 0 1 5.2-5.2h4.4"/>' +
    '<path d="M14.4 18.4l2.8 2.8 5-5.4"/>',
  plazo:
    '<path d="M5.6 2.2h12.8M5.6 21.8h12.8"/>' +
    '<path d="M7.4 2.2v4.4c0 1.1.5 2.1 1.3 2.8L12 12l-3.3 2.6c-.8.7-1.3 1.7-1.3 2.8v4.4"/>' +
    '<path d="M16.6 2.2v4.4c0 1.1-.5 2.1-1.3 2.8L12 12l3.3 2.6c.8.7 1.3 1.7 1.3 2.8v4.4"/>',

  // Cabecera (van dentro del aro)
  aprobada: '<path d="M4.6 12.4 9.8 17.6 19.4 6.6"/>',
  ti:
    '<rect x="3.6" y="4" width="16.8" height="11.6" rx="1.8"/>' +
    '<path d="M1.6 18.8h20.8"/><path d="M10.4 18.8h3.2"/>',
  decision:
    '<path d="M3.6 5.8h9.6M3.6 12h9.6M3.6 18.2h6.4"/>' +
    '<path d="M14.8 16.8 17.4 19.4 22 13.8"/>',
  entrevista:
    '<rect x="2.8" y="4.6" width="18.4" height="17" rx="2.2"/>' +
    '<path d="M2.8 9.8h18.4M7.8 2.6v4.2M16.2 2.6v4.2"/>' +
    '<circle cx="12" cy="14" r="2.2"/>' +
    '<path d="M8.4 19.6a3.9 3.9 0 0 1 7.2 0"/>',
  gracias:
    '<path d="M12 20.8 4.6 13.4a4.8 4.8 0 0 1 6.8-6.8l.6.6.6-.6a4.8 4.8 0 0 1 6.8 6.8Z"/>',
  finalista: estrella(12, 12.4, 10.2, 4.4),
  longlist:
    '<circle cx="8.2" cy="6.9" r="4.6"/>' +
    '<path d="M1.6 21.8v-1.6a5.2 5.2 0 0 1 5.2-5.2h2.8a5.2 5.2 0 0 1 5.2 5.2v1.6"/>' +
    '<path d="M16.6 2.8a4.6 4.6 0 0 1 0 8.6"/>' +
    '<path d="M18.2 15.2a5.2 5.2 0 0 1 4.2 5.1v1.5"/>',
  formulario:
    '<path d="M14.2 2.4H6.8a2.4 2.4 0 0 0-2.4 2.4v14.4a2.4 2.4 0 0 0 2.4 2.4h10.4a2.4 2.4 0 0 0 2.4-2.4V7.6Z"/>' +
    '<path d="M14.2 2.4v5.2h5.4"/>' +
    '<path d="M8 12.4h8M8 16.4h5.6"/>',
  correccion:
    '<path d="M14.2 2.4H6.8a2.4 2.4 0 0 0-2.4 2.4v14.4a2.4 2.4 0 0 0 2.4 2.4h10.4a2.4 2.4 0 0 0 2.4-2.4V7.6Z"/>' +
    '<path d="M14.2 2.4v5.2h5.4"/>' +
    '<path d="M12 10.6v4.6M12 18.6h.02"/>',

  // Franja (van dentro del círculo relleno, en blanco)
  franjaCheck: '<path d="M4.6 12.4 9.8 17.6 19.4 6.6"/>',
  franjaEquis: '<path d="M6 6l12 12M18 6 6 18"/>',
  franjaInfo: '<path d="M12 10.6v8M12 5.8h.02"/>',
  franjaLapiz:
    '<path d="M4.4 19.6h3.4L19.2 8.2a2.4 2.4 0 0 0-3.4-3.4L4.4 16.2Z"/>' +
    '<path d="M14.8 5.8l3.4 3.4"/>',
};

/**
 * Centra y reduce el glifo dentro del aro. El stroke se divide entre la escala para que el
 * trazo del glifo se vea igual de grueso que el del aro, que no se escala.
 */
function glifoCentrado(glifo, trazo, escala = ESCALA_GLIFO) {
  const d = ((12 * (1 - escala)) / escala).toFixed(3);
  return `<g transform="scale(${escala}) translate(${d} ${d})" stroke-width="${(trazo / escala).toFixed(2)}">${glifo}</g>`;
}

/** Ícono de fila de tarjeta: aro lima + glifo, 56x56 (se muestra a 28px). */
function svgFila(glifo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="${LIMA}" stroke-width="${TRAZO}" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="11.2"/>${glifoCentrado(glifo, TRAZO)}</svg>`;
}

/** Ícono de cabecera: mismo aro que el de fila pero a 96x96 (se muestra a 44px). */
function svgAro(glifo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${LIMA}" stroke-width="${TRAZO}" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="11.2"/>${glifoCentrado(glifo, TRAZO)}</svg>`;
}

/** Ícono de franja: círculo relleno del color del estado + glifo blanco, 88x88 (se muestra a 40px). */
function svgFranja(glifo, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="${color}"/><g fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round">${glifoCentrado(glifo, 1.7)}</g></svg>`;
}

const ICONOS = {
  // Fila de tarjeta (28px en el correo)
  'req-codigo': svgFila(G.codigo),
  'req-puesto': svgFila(G.puesto),
  'req-proyecto': svgFila(G.proyecto),
  'req-fecha': svgFila(G.fecha),
  'req-hora': svgFila(G.hora),
  'req-lugar': svgFila(G.lugar),
  'req-candidato': svgFila(G.candidato),
  'req-candidatos': svgFila(G.candidatos),
  'req-correo': svgFila(G.correo),
  'req-celular': svgFila(G.celular),
  'req-estado': svgFila(G.estado),
  'req-comentario': svgFila(G.comentario),
  'req-vistobueno': svgFila(G.vistobueno),
  'req-plazo': svgFila(G.plazo),

  // Cabecera (44px en el correo)
  'req-aprobada': svgAro(G.aprobada),
  'req-ti': svgAro(G.ti),
  'req-decision': svgAro(G.decision),
  'req-entrevista': svgAro(G.entrevista),
  'req-gracias': svgAro(G.gracias),
  'req-finalista': svgAro(G.finalista),
  'req-longlist': svgAro(G.longlist),
  'req-formulario': svgAro(G.formulario),
  'req-correccion': svgAro(G.correccion),

  // Franja (40px en el correo)
  'req-check': svgFranja(G.franjaCheck, VERDE),
  'req-rechazadas': svgFranja(G.franjaEquis, ROJO),
  'req-aviso': svgFranja(G.franjaInfo, TEAL),
  'req-observaciones': svgFranja(G.franjaLapiz, AMBAR),
};

// ── Logo de los correos ──────────────────────────────────────────────────────
//
// El logo de los correos es un archivo aparte del que usa la app y se deriva de él acá.
//
// Por qué no se usa directo public/images/abril-logo.png: ese archivo dice .png en el nombre
// pero sus bytes son WebP (empieza en RIFF....WEBP), y además tiene transparencia. Los
// navegadores y Outlook lo detectan por contenido y lo muestran bien, así que el nombre
// equivocado nunca molestó dentro de la app. En Gmail sí: sus imágenes no las carga el cliente
// sino su proxy (ci*.googleusercontent.com), que no reenvía WebP — lo recodifica, y lo
// recodifica a JPEG. JPEG no tiene canal alfa, así que el fondo transparente se aplanaba y el
// logo salía dentro de un recuadro negro, pero SOLO en Gmail. Los íconos del mismo correo se
// veían bien porque esos sí son PNG de verdad y el proxy los reenvía tal cual.
//
// Las dos cosas que lo evitan van dentro de este archivo generado:
// 1. Es un PNG de verdad, así que ningún proxy necesita recodificarlo.
// 2. No tiene canal alfa: el blanco de la tarjeta del correo viene pintado adentro. Aunque
//    mañana otro cliente o pasarela vuelva a aplanarlo, lo aplana contra blanco y no contra
//    negro. Mismo criterio que los aros de los íconos: lo que el cliente de correo puede
//    arruinar se resuelve dentro del binario, no confiando en que lo respete.
const LOGO_ORIGEN = path.join(__dirname, '..', 'public', 'images', 'abril-logo.png');
const LOGO_DESTINO = path.join(__dirname, '..', 'public', 'images', 'emails', 'abril-logo.png');

/** El correo lo muestra a 150px; se genera al doble para que no se vea borroso en retina. */
const LOGO_ANCHO = 300;

(async () => {
  if (!fs.existsSync(OUT)) {
    console.error(`[email-icons] No existe ${OUT}`);
    process.exit(1);
  }

  for (const [nombre, svg] of Object.entries(ICONOS)) {
    const destino = path.join(OUT, `${nombre}.png`);
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(destino);
    console.log(`[email-icons] ${nombre}.png`);
  }

  console.log(`[email-icons] ${Object.keys(ICONOS).length} íconos generados en ${OUT}`);

  // El flatten va ANTES del resize: escalar una imagen ya opaca no puede dejar halos en los
  // bordes del logotipo, escalar una con alfa sí.
  await sharp(LOGO_ORIGEN)
    .flatten({ background: '#FFFFFF' })
    .resize({ width: LOGO_ANCHO })
    .png({ compressionLevel: 9 })
    .toFile(LOGO_DESTINO);

  console.log(`[email-icons] abril-logo.png (${LOGO_ANCHO}px, opaco) generado en ${LOGO_DESTINO}`);
})();
