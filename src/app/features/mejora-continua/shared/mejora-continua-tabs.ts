import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Mejora Continua — única fuente para todas sus páginas.
 *  Cada featureKey coincide con el del roleGuard de su ruta. "Configuración" es una
 *  pestaña contenedor: aparece con la feature paraguas O con cualquier sub-feature
 *  de sus secciones (mismo set que el guard del shell), así se ve para quien tiene
 *  acceso a alguna sección aunque no tenga la feature paraguas. */
export const MEJORA_CONTINUA_TABS: AbrilPageTab[] = [
  { label: 'Cronograma de Hitos',  icono: 'ti-flag',             route: '/mejora-continua/milestone-schedule',      featureKey: 'mejora-continua.milestone-schedule' },
  { label: 'Dashboard',            icono: 'ti-layout-dashboard', route: '/mejora-continua/dashboard',               featureKey: 'mejora-continua.dashboard' },
  { label: 'Lecciones Aprendidas', icono: 'ti-list',             route: '/mejora-continua/lessons-learned',         featureKey: 'mejora-continua.lessons-learned' },
  { label: 'Configuración',        icono: 'ti-settings',         route: '/mejora-continua/lecciones-configuracion', featureKeys: ['mejora-continua.config.lecciones-configuracion','mejora-continua.config.areas','mejora-continua.config.area-relations','mejora-continua.config.templates','mejora-continua.config.catalog-types','mejora-continua.config.catalog-items'] },
  { label: 'Recordatorios',        icono: 'ti-bell',             route: '/mejora-continua/configuration/reminders', featureKey: 'mejora-continua.config.reminders' },
];
