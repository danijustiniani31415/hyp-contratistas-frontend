# Sistema de Diseño — HP Constructores Generales / Las Bravas

> **Única fuente de verdad de UI para este proyecto.** Reemplaza a `DESIGN-VICTOR.md` (heredado
> del fork de Abril-Frontend) como referencia de diseño — ese archivo queda solo como historial,
> no se borra porque parte de su contenido (tipografía, espaciado, sistema de color del Gantt)
> sigue vigente y está citado aquí. Definido comparando componentes **reales** ya construidos en
> `/catalogo-ui` (ruta pública de este mismo repo) contra capturas de pantallas reales que ya
> funcionaban bien, no inventado desde cero.

---

## 0. Regla obligatoria de código: estado async siempre en signals

**Nunca usar campos de clase planos (`this.algo = valor`) para estado que se actualiza dentro de
un `.subscribe()`, un `setTimeout`, SignalR, o cualquier callback asíncrono.** Usar siempre
`signal()` de Angular, y leerlos como función en el template (`personas()`, no `personas`).

**Por qué (bug real, encontrado y corregido 2026-09-08):** esta app usa
`provideHttpClient(withFetch())`, y en este entorno Zone.js **no parcha `fetch()`**
(`window.fetch.toString()` devuelve `"[native code]"`, no la versión parcheada). Eso significa
que cuando una petición HTTP resuelve, Angular nunca se entera de que "algo cambió" y no agenda
sola una detección de cambios — el dato llega perfecto (200 OK, JSON correcto, visible en
Network) pero la vista se queda pegada en su estado anterior (ej. "Cargando...") **para
siempre**, aunque el componente ya tenga el dato correcto en memoria. Este es, casi seguro, el
mismo patrón detrás de los "se queda cargando" que aparecían repetidamente en Abril.

Un interceptor HTTP que fuerza `ApplicationRef.tick()` en cada respuesta se probó y se descartó:
es frágil, choca con `NG0101 (tick is called recursively)` cuando la respuesta llega mientras
Angular ya está en medio de otro tick. Los **signals** no tienen este problema — notifican a
Angular directamente por su propio sistema de reactividad, sin depender en absoluto de que
Zone.js haya parcheado `fetch`, `setTimeout`, WebSockets, etc.

Referencia de implementación correcta: `features/personas/personas.ts`.

---

## 1. Paleta de color

**Base: teal** (`--color-abril-standard`, hoy `#0F6E56`). Decisión abierta a propósito — se van
sacando piezas puntuales de `DESIGN-VICTOR.md` (tipografía, espaciado, specs de tabla) según se
necesiten, no todo el sistema navy/UDP de ese documento.

**Excepción confirmada:** el chrome de controles secundarios (botones, tabs, toggle, drawer,
encabezados de tabla) terminó usando **navy** (`#1E3A5F`) de forma consistente en todas las
decisiones de abajo — es el acento real que ganó en la práctica, no el teal. Tratar `#1E3A5F` como
el segundo color de marca, no como "el navy de UDP que se descartó".

---

## 2. Decisiones por componente

| Categoría | Ganador | Estado |
|---|---|---|
| Combobox / select | `app-search-select` (A) | ✅ ya existe, sin cambios |
| Modal — formulario corto | `app-base-modal`, X corregida a teal | ✅ corregido en el componente real |
| Modal — formulario largo/muchos campos | Drawer lateral (entra desde la derecha) | 🔧 no existe — construir `app-drawer` |
| `app-abril-modal-panel` | — | ⏳ pendiente: ¿se descontinúa o queda solo para SSOMA? |
| Fecha y hora | Input nativo simple (`type="date"`/`"time"` + `.abril-field`) | ✅ ya existe (clase global) |
| Archivos / fotos (drag&drop) | Estilo navy/gris sobrio, borde sólido (no punteado verde) | 🔧 cambiar colores default de `app-file-selector` |
| Firma digital | `app-signature-pad` + metadata automática de lugar/fecha-hora | 🔧 el lienzo ya existe — falta el wrapper con metadata |
| Badges de estado | Contorno (borde de color, fondo blanco, pill) | 🔧 cambiar el estilo de `app-status-badge` |
| Tabs de sección | Íconos + texto, subrayado azul en la activa, sin fondo sólido | 🔧 agregar campo `icon` a `SectionTab` en `app-section-tabs` |
| Toggle segmentado | Deslizante (fondo que se mueve entre las 2 opciones) | 🔧 no existe — nueva variante de `app-view-toggle` o componente nuevo |
| Checkbox / radio | Custom (cuadrito/círculo propio, color navy) | 🔧 no existe — construir `app-checkbox` / `app-radio` |
| Botón flotante | `app-fab` | ✅ ya existe, sin cambios |
| Paginador | `app-paginator` | ✅ ya existe, sin cambios |
| Tablas | SaaS moderno (aire generoso, checkbox al hover, íconos) + encabezado estilo Odoo (navy negrita, borde inferior 2px, sin fondo) | 🔧 reemplaza el `.abril-table` actual (teal sólido) |
| Gráficas | Línea + relleno suave (16% opacidad), color fijo por métrica — el patrón real de `dashboard-proyecto`, no una paleta categórica compartida | 🔧 extraer como helper reutilizable (hoy vive solo en esa pantalla) |
| Cronograma / Gantt | Sin cambios — sistema ya definido en `DESIGN-VICTOR.md` §2.2 (10 colores de rama, acento `border-left`, badge de fase circular, línea conectora) | ✅ ya implementado en `cronograma-actividades` |

Leyenda: ✅ ya existe tal cual quedó decidido · 🔧 hay que construirlo/cambiarlo · ⏳ decisión pendiente.

---

## 3. Pendiente de construir (antes de usarlo "de manera obligatoria")

Estos 6 puntos son los que **no existen todavía** como el estándar decidido arriba — hasta que se
construyan, seguir usando lo que ya hay en cada pantalla puntual, no inventar una versión propia
por página mientras tanto:

1. **Drawer lateral** (`app-drawer`) — modal deslizante desde la derecha para formularios largos.
2. **`app-abril-modal-panel`** — decidir su destino (descontinuar vs. exclusivo SSOMA).
3. **Firma con metadata** — wrapper sobre `app-signature-pad` que agrega lugar + fecha/hora
   automática del sistema.
4. **`app-checkbox` / `app-radio`** — componentes nuevos, estilo custom navy.
5. **`SectionTab.icon`** — agregar el campo al modelo de `app-section-tabs` para el estilo
   íconos+azul.
6. **Helper de gráfica de línea con relleno** — extraer el patrón de `dashboard-proyecto` a un
   servicio/función compartida en vez de dejarlo copiado por pantalla.

## 4. Referencia visual completa

Todo lo de arriba se puede ver renderizado en vivo en **`/catalogo-ui`** de este mismo repo
(`npm start` → `http://localhost:4300/catalogo-ui`) — componentes reales, no mockups.
