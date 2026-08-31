import { AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Observación Planeada (OPT) — única fuente para sus páginas.
 *  Cada featureKey coincide con el del roleGuard de su ruta (opt.routes.ts). */
export const OPT_TABS: AbrilPageTab[] = [
  { label: 'Dashboard', icono: 'ti-layout-dashboard', route: '/ssoma/gestion/opt/dashboard', featureKey: 'ssoma.gestion.opt.dashboard' },
  { label: 'Lista',     icono: 'ti-list',             route: '/ssoma/gestion/opt/lista',     featureKey: 'ssoma.gestion.opt.lista' },
];
