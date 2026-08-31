import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Arquitectura Comercial — única fuente para todas sus páginas.
 *  Cada featureKey coincide con el del roleGuard de su ruta (ver
 *  arquitectura-comercial-routing-module.ts), así una pestaña visible siempre es accesible. */
export const AC_TABS: AbrilPageTab[] = [
  { label: 'Dashboard',   icono: 'ti-layout-dashboard', route: '/arquitectura-comercial/dashboard',   featureKey: 'arquitectura-comercial.dashboard' },
  { label: 'Actividades', icono: 'ti-list-check',       route: '/arquitectura-comercial/actividades', featureKey: 'arquitectura-comercial.actividades' },
  { label: 'Gantt',       icono: 'ti-chart-bar',        route: '/arquitectura-comercial/gantt',       featureKey: 'arquitectura-comercial.gantt' },
  { label: 'Plantilla',   icono: 'ti-template',         route: '/arquitectura-comercial/plantilla',   featureKey: 'arquitectura-comercial.plantilla' },
  { label: 'Tareo',       icono: 'ti-clock-play',       route: '/arquitectura-comercial/tareo/marcar', featureKey: 'arquitectura-comercial.tareo.marcar' },
];

export const AC_OBSERVACIONES_TABS: AbrilPageTab[] = [
  { label: 'Dashboard', icono: 'ti-layout-dashboard', route: '/arquitectura-comercial/observaciones/dashboard', featureKey: 'arquitectura-comercial.observaciones.dashboard' },
  { label: 'Lista',     icono: 'ti-list',             route: '/arquitectura-comercial/observaciones/lista',     featureKey: 'arquitectura-comercial.observaciones.lista' },
];

export const AC_REVISIONES_TABS: AbrilPageTab[] = [
  { label: 'Dashboard', icono: 'ti-layout-dashboard', route: '/arquitectura-comercial/revisiones/dashboard', featureKey: 'arquitectura-comercial.revisiones.dashboard' },
  { label: 'Lista',     icono: 'ti-list',             route: '/arquitectura-comercial/revisiones/lista',     featureKey: 'arquitectura-comercial.revisiones.lista' },
];

export const AC_TAREO_TABS: AbrilPageTab[] = [
  { label: 'Marcar',            icono: 'ti-clock-play',   route: '/arquitectura-comercial/tareo/marcar',            featureKey: 'arquitectura-comercial.tareo.marcar' },
  { label: 'Enrolamiento',      icono: 'ti-camera',       route: '/arquitectura-comercial/tareo/enrolamiento-asistido', featureKey: 'arquitectura-comercial.tareo.enrolamiento' },
  { label: 'Gestión de permisos', icono: 'ti-face-id',    route: '/arquitectura-comercial/tareo/gestion-permisos',  featureKey: 'arquitectura-comercial.tareo.gestion-permisos' },
  { label: 'Revisión',          icono: 'ti-list-check',   route: '/arquitectura-comercial/tareo/revision',          featureKey: 'arquitectura-comercial.tareo.revision' },
  { label: 'Reporte',           icono: 'ti-table',        route: '/arquitectura-comercial/tareo/reporte',           featureKey: 'arquitectura-comercial.tareo.reporte' },
];
