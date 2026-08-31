import { AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header del Programa Anual SSOMA (PASO) — única fuente para sus páginas.
 *  Todas las sub-secciones comparten la misma feature del roleGuard (paso.routes.ts). */
export const PASO_TABS: AbrilPageTab[] = [
  { label: 'Dashboard', icono: 'ti-layout-dashboard', route: '/ssoma/gestion/paso/dashboard', featureKey: 'ssoma.gestion.paso' },
  { label: 'Programas', icono: 'ti-list',             route: '/ssoma/gestion/paso/lista',     featureKey: 'ssoma.gestion.paso' },
  { label: 'Alertas',   icono: 'ti-bell',             route: '/ssoma/gestion/paso/alertas',   featureKey: 'ssoma.gestion.paso' },
];
