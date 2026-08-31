import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Costos y Presupuestos — única fuente para todas sus páginas. */
export const COSTS_TABS: AbrilPageTab[] = [
  { label: 'Dashboard',      icono: 'ti-layout-dashboard', route: '/costs/dashboard',      featureKey: 'costs.dashboard' },
  { label: 'Adjudicaciones', icono: 'ti-list',             route: '/costs/adjudicaciones', featureKey: 'costs.adjudicaciones' },
  { label: 'Configuración',  icono: 'ti-settings',         route: '/costs/configuration',  featureKeys: ['costs.config.work-item','costs.config.work-item-category','costs.config.work-specialty','costs.config.staff-project-email','costs.config.project-link','costs.config.adjudicacion-folder','costs.config.costos-presupuestos-email'] },
];
