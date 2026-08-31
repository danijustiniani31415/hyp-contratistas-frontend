import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Administración de Obra (Vecinos) — única fuente para todas sus páginas. */
export const VECINOS_TABS: AbrilPageTab[] = [
  { label: 'Dashboard',               icono: 'ti-layout-dashboard', route: '/vecinos/dashboard',            featureKey: 'vecinos.dashboard' },
  { label: 'Gestión de Vecinos',      icono: 'ti-users',            route: '/vecinos/gestion',              featureKey: 'vecinos.gestion' },
  { label: 'Croquis',                 icono: 'ti-map-2',            route: '/vecinos/croquis',              featureKey: 'vecinos.croquis' },
  { label: 'Control de Licencias',    icono: 'ti-calendar-due',     route: '/vecinos/control-licencias',    featureKey: 'vecinos.control-licencias' },
];
