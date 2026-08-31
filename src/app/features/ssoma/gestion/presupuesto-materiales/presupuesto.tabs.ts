import { AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';

/**
 * Única lista de tabs del módulo Presupuesto de Materiales — la comparten las 5 páginas
 * (Cargas, Drivers, Ratios, Kits/BOM, Catálogo) para que se vean idénticas en cualquier
 * pantalla. Todas usan `route` (routerLink real), nunca `active` local — eso evita el bug
 * NG0103 que salió antes al mezclar dos rutas sobre el mismo componente.
 *
 * Ya no hay una pestaña "Revisión" separada: esa pantalla (por proyecto, sin filtro ni
 * paginación) se consolidó dentro de "Catálogo → Sin estandarizar", que ya cubría lo mismo
 * pero de forma global (todos los proyectos, filtro de texto, paginación) — la ruta
 * `/revision` redirige ahí (ver presupuesto.routes.ts) por si quedó algún enlace viejo.
 *
 * `exact: true` en todas: la ruta de "Cargas" (path base '', incluye S10 de materiales y
 * Excel de HH) sin esto queda marcada activa en TODA ruta hija por el matching por defecto
 * de routerLinkActive (subset) — incluyendo proyecto/:id y presupuesto/:id, que ni siquiera
 * son una pestaña. Con exact:true, esas pantallas simplemente no marcan ninguna pestaña, que
 * es lo correcto.
 */
export const PRESUPUESTO_TABS: AbrilPageTab[] = [
  { label: 'Cargas',                  icono: 'ti-file-spreadsheet', route: '/ssoma/gestion/presupuesto-materiales', exact: true },
  { label: 'Datos Base',              icono: 'ti-settings',        route: '/ssoma/gestion/presupuesto-materiales/drivers', exact: true },
  { label: 'Ratios',                  icono: 'ti-chart-bar',       route: '/ssoma/gestion/presupuesto-materiales/ratios', exact: true },
  { label: 'Kits / BOM',              icono: 'ti-package',         route: '/ssoma/gestion/presupuesto-materiales/kits', exact: true },
  { label: 'Catálogo',                icono: 'ti-list-details',    route: '/ssoma/gestion/presupuesto-materiales/catalogo', exact: true },
];
