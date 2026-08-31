import { AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Salud Ocupacional — única fuente para todas sus páginas.
 *  (Antes vivía como SSOMA_TABS en topico.component.ts.)
 *  Cada featureKey coincide con el del roleGuard de su ruta (salud-ocupacional.routes.ts). */
export const SSOMA_TABS: AbrilPageTab[] = [
  { label: 'Dashboard',      icono: 'ti-layout-dashboard',  route: '/ssoma/salud-ocupacional/dashboard',      featureKey: 'ssoma.salud-ocupacional.dashboard' },
  { label: 'EMOs',           icono: 'ti-stethoscope',       route: '/ssoma/salud-ocupacional/emos',           featureKey: 'ssoma.salud-ocupacional.emos' },
  { label: 'Programaciones', icono: 'ti-calendar',          route: '/ssoma/salud-ocupacional/programaciones', featureKey: 'ssoma.salud-ocupacional.programaciones' },
  { label: 'Interconsultas', icono: 'ti-arrows-right-left', route: '/ssoma/salud-ocupacional/interconsultas', featureKey: 'ssoma.salud-ocupacional.interconsultas' },
  { label: 'Convalidaciones',icono: 'ti-check',             route: '/ssoma/salud-ocupacional/convalidaciones', featureKey: 'ssoma.salud-ocupacional.convalidaciones' },
  { label: 'Tópico Médico',  icono: 'ti-first-aid-kit',     route: '/ssoma/salud-ocupacional/topico',         featureKey: 'ssoma.salud-ocupacional.topico' },
  { label: 'Accidentes',     icono: 'ti-alert-triangle',    route: '/ssoma/salud-ocupacional/accidentes',     featureKey: 'ssoma.salud-ocupacional.accidentes' },
  { label: 'Descansos',      icono: 'ti-bed',               route: '/ssoma/salud-ocupacional/descansos',      featureKey: 'ssoma.salud-ocupacional.descansos' },
  { label: 'Asistente Social', icono: 'ti-heart-handshake', route: '/ssoma/salud-ocupacional/asistente-social', featureKey: 'ssoma.salud-ocupacional.asistente-social' },
  { label: 'PASO', icono: 'ti-clipboard-check', route: '/ssoma/salud-ocupacional/paso', featureKey: 'ssoma.salud-ocupacional.paso' },
  { label: 'Mi Salud', icono: 'ti-user-heart', route: '/ssoma/salud-ocupacional/mi-salud', featureKey: 'ssoma.salud-ocupacional.mi-salud' },
];
