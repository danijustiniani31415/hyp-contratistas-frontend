import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Clínica — única fuente para todas sus páginas.
 *  featureKey + roles replican el roleGuard de cada ruta (clinica.routes.ts): la
 *  sesión CLINICA no viaja con allowed_features, así que se resuelve por rol; un
 *  staff con la feature suelta entra por featureKey. Coinciden con el guard, por lo
 *  que una pestaña visible siempre es accesible. */
export const CLINICA_TABS: AbrilPageTab[] = [
  { label: 'Dashboard',       icono: 'ti-layout-dashboard',   route: '/clinica/dashboard',      featureKey: 'clinica.agenda',          roles: ['CLINICA'] },
  { label: 'Agenda',          icono: 'ti-calendar',           route: '/clinica/agenda',         featureKey: 'clinica.agenda',          roles: ['CLINICA'] },
  { label: 'Programaciones',  icono: 'ti-clock',              route: '/clinica/programaciones', featureKey: 'clinica.programaciones',  roles: ['CLINICA'] },
  { label: 'Interconsultas',  icono: 'ti-stethoscope',        route: '/clinica/interconsultas', featureKey: 'clinica.agenda',          roles: ['CLINICA'] },
  { label: 'Control de EMOs', icono: 'ti-heart-rate-monitor', route: '/clinica/emos',           featureKey: 'clinica.agenda',          roles: ['CLINICA'] },
];
