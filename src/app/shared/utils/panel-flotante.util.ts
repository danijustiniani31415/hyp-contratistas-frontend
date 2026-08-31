/**
 * Utilidades de los paneles flotantes que abren `app-search-select`, `app-date-picker` y
 * `app-time-picker`.
 *
 * Los tres abren su desplegable con `position: fixed` en vez de `absolute`, y por el mismo motivo:
 * así el panel puede salirse de su contenedor. Dentro de un modal angosto o de una celda de tabla,
 * un panel `absolute` queda recortado por el `overflow` del contenedor, y la alternativa —dejar que
 * el contenedor crezca— hace que el modal se agrande y se achique cada vez que se abre y se cierra
 * el desplegable.
 */

/**
 * Propiedades que hacen que un elemento se convierta en el **bloque contenedor** de los
 * `position: fixed` que cuelgan de él. Con cualquiera de ellas puesta, `top`/`left` de un panel
 * fijo dejan de medirse contra el viewport y pasan a medirse contra ese elemento.
 *
 * Es una lista de CSS, no una elección de diseño: está en la definición de "containing block" de
 * CSS Position y CSS Transforms.
 */
function estableceBloqueContenedor(estilo: CSSStyleDeclaration): boolean {
  const noVacio = (v: string | undefined | null) => !!v && v !== 'none';
  // `translate`/`rotate`/`scale` son las propiedades independientes de transform (Tailwind v4 las
  // usa para `translate-x-*`): cuentan igual que `transform` aunque valgan 0.
  const anyEstilo = estilo as unknown as Record<string, string | undefined>;
  if (
    noVacio(estilo.transform) ||
    noVacio(anyEstilo['translate']) ||
    noVacio(anyEstilo['rotate']) ||
    noVacio(anyEstilo['scale']) ||
    noVacio(estilo.perspective) ||
    noVacio(estilo.filter) ||
    noVacio(anyEstilo['backdropFilter'])
  ) {
    return true;
  }
  if (estilo.willChange && /transform|perspective|filter/.test(estilo.willChange)) return true;
  if (estilo.contain && /\b(paint|layout|strict|content)\b/.test(estilo.contain)) return true;
  return anyEstilo['contentVisibility'] === 'auto';
}

/**
 * Ancestro contra el que se van a posicionar los `position: fixed` que cuelguen de `nodo`, o `null`
 * cuando ese ancestro es el viewport (el caso normal).
 *
 * Se resuelve una sola vez al abrir el panel y se guarda: lo que cambia al scrollear es su caja, no
 * cuál es el elemento. Sirve para convertir una posición calculada en coordenadas de viewport a las
 * coordenadas que hay que escribir en `top`/`left`/`bottom`: sin esto, un desplegable dentro de un
 * contenedor con `transform` —por ejemplo el cajón de filtros, que se abre y se cierra con
 * `translate-x-*`— se dibuja desplazado por el origen de ese contenedor y termina fuera de la
 * pantalla.
 */
export function bloqueContenedorFijo(nodo: HTMLElement): HTMLElement | null {
  if (typeof window === 'undefined') return null;
  let padre = nodo.parentElement;
  while (padre && padre !== document.documentElement) {
    if (estableceBloqueContenedor(getComputedStyle(padre))) return padre;
    padre = padre.parentElement;
  }
  return null;
}

/**
 * Ancestros con scroll u `overflow: hidden` que pueden recortar a `nodo`. El panel se cierra
 * cuando alguno de ellos deja de mostrarlo (ver `anclaSigueVisible`), para que no quede flotando
 * sobre contenido que no le corresponde.
 *
 * El recorrido se corta al llegar a un ancestro `position: fixed`: ese subárbol se posiciona
 * respecto al viewport, así que el overflow de lo que está por encima ya no lo recorta. Sin ese
 * corte, un campo dentro de un modal a pantalla completa arrastraba como "recortadores" a
 * contenedores del layout que empiezan después del sidebar y que ni siquiera lo contienen
 * visualmente: el campo caía fuera de ellos, se lo daba por oculto y el panel se cerraba apenas se
 * abría.
 */
export function contenedoresQueRecortan(nodo: HTMLElement): HTMLElement[] {
  if (typeof window === 'undefined') return [];
  const out: HTMLElement[] = [];
  let actual = nodo;
  let estiloActual = getComputedStyle(actual);
  let padre = actual.parentElement;
  while (padre && padre !== document.body && padre !== document.documentElement) {
    if (estiloActual.position === 'fixed') break;
    const estiloPadre = getComputedStyle(padre);
    if (/auto|scroll|hidden/.test(estiloPadre.overflowY + ' ' + estiloPadre.overflowX)) {
      out.push(padre);
    }
    actual = padre;
    estiloActual = estiloPadre;
    padre = padre.parentElement;
  }
  return out;
}

/** true si `rect` sigue a la vista: dentro del viewport y sin que lo recorte ningún contenedor. */
export function anclaSigueVisible(rect: DOMRect, contenedores: HTMLElement[]): boolean {
  if (typeof window === 'undefined') return false;
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
  return contenedores.every((c) => {
    const r = c.getBoundingClientRect();
    return rect.bottom > r.top && rect.top < r.bottom && rect.right > r.left && rect.left < r.right;
  });
}
