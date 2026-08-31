import { AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Gestión RAC — única fuente para sus páginas.
 *  Cada featureKey coincide con el del roleGuard de su ruta (rac.routes.ts): las
 *  sub-secciones tienen features propias (dashboard/lista/penalidades). */
export const RAC_TABS: AbrilPageTab[] = [
  { label: 'Dashboard',   icono: 'ti-layout-dashboard', route: '/ssoma/gestion/rac/dashboard',   featureKey: 'ssoma.gestion.rac.dashboard' },
  { label: 'Lista',       icono: 'ti-list',             route: '/ssoma/gestion/rac/lista',       featureKey: 'ssoma.gestion.rac.lista' },
  { label: 'Penalidades', icono: 'ti-alert-triangle',   route: '/ssoma/gestion/rac/penalidades', featureKey: 'ssoma.gestion.rac.penalidades' },
];
