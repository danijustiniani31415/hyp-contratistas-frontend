import { AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Inspecciones — única fuente para sus páginas. */
export const INSPECCION_TABS: AbrilPageTab[] = [
  { label: 'Dashboard',    icono: 'ti-layout-dashboard', route: '/ssoma/gestion/inspeccion/dashboard' },
  { label: 'Inspecciones', icono: 'ti-list',             route: '/ssoma/gestion/inspeccion/lista' },
  { label: 'Abiertas',     icono: 'ti-users',            route: '/ssoma/gestion/inspeccion/abiertas' },
];
