import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Configuración — única fuente para todas sus páginas.
 *  Cada featureKey coincide con el del roleGuard de su ruta (configuracion-module.ts). */
export const CONFIGURACION_TABS: AbrilPageTab[] = [
  { label: 'Proyectos',                       icono: 'ti-folder',   route: '/configuracion/proyectos', featureKey: 'configuracion.proyectos' },
  { label: 'Áreas',                           icono: 'ti-layout',   route: '/configuracion/area',      featureKey: 'configuracion.area' },
  { label: 'Razones Sociales',                icono: 'ti-building', route: '/configuracion/companies', featureKey: 'configuracion.companies' },
  { label: 'Trabajadores',                    icono: 'ti-users',    route: '/configuracion/workers',   featureKey: 'configuracion.workers' },
  // 'Categorías y Puestos' se movió a Gestión GTH → Configuración
  // (/gestion-gth/configuracion/categorias-puestos): los administra GTH, no Configuración
  // global.
  { label: 'Revisores de Áreas',              icono: 'ti-users-group', route: '/configuracion/revisores-areas',  featureKey: 'configuracion.revisores-areas' },
  { label: 'Feriados y Días no Laborables',   icono: 'ti-calendar', route: '/configuracion/feriados',  featureKey: 'configuracion.feriados' },
  { label: 'Centro de aprendizaje',           icono: 'ti-player-play', route: '/configuracion/aprendizaje', featureKey: 'configuracion.aprendizaje' },
];
