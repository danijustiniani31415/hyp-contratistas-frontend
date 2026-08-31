import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Roles } from '../../core/constants/roles';
import { IvtControl } from './ivt-control/ivt-control';
import { ConstructionLogbookControl } from './construction-logbook-control/construction-logbook-control';
import { ReportResponseControl } from './report-response-control/report-response-control';
import { ResidentMonitoringMeasurement } from './resident-monitoring-measurement/resident-monitoring-measurement';
import { ProjectsDashboard } from './projects-dashboard/projects-dashboard';
import { CronogramaActividades } from './cronograma-actividades/cronograma-actividades';
import { ProyectosCronogramaList } from './cronograma-actividades/proyectos-cronograma-list';
import { CronogramaDashboard } from './cronograma-dashboard/cronograma-dashboard';
import { ActasReunion } from './actas-reunion/actas-reunion';
import { ActasReunionDashboard } from './actas-reunion/dashboard/actas-reunion-dashboard';
import { ReunionDetail } from './actas-reunion/reunion-detail/reunion-detail';
import { ReunionAgenda } from './actas-reunion/reunion-agenda/reunion-agenda';
import { ActasReunionConfiguracion } from './actas-reunion/configuracion/actas-reunion-configuracion';
import { AcuerdoDecision } from './actas-reunion/acuerdo-decision/acuerdo-decision';
import { AcuerdosBusqueda } from './actas-reunion/acuerdos-busqueda/acuerdos-busqueda';

import { ConfiguracionInicial } from './planeamiento-bim/configuracion-inicial/configuracion-inicial';
import { CargaDiaria } from './planeamiento-bim/carga-diaria/carga-diaria';
import { Restricciones } from './planeamiento-bim/restricciones/restricciones';
import { PlaneamientoBimDashboard } from './planeamiento-bim/dashboard/dashboard';
import { PlaneamientoBimPortafolio } from './planeamiento-bim/portafolio/portafolio';

export const PROJECTS_ROUTES: Routes = [
  { path: '', redirectTo: 'projects-dashboard', pathMatch: 'full' },
  {
    path: 'planeamiento-bim',
    redirectTo: 'planeamiento-bim/configuracion-inicial',
    pathMatch: 'full',
  },
  {
    // Landing del feature (antes de elegir proyecto) — restringido a
    // AdministradorSistema/AdministradorUdp, sin UsuarioUdp (mismo rol que exige
    // [Authorize] en PlaneamientoBimPortafolioController). No comparte el
    // featureKey del resto del módulo a propósito: ese featureKey ya está
    // sembrado para USUARIO_UDP, y roleGuard es un OR (featureKey O roles) —
    // compartirlo dejaría entrar a UsuarioUdp aunque el backend luego le tire 403.
    path: 'planeamiento-bim/portafolio',
    component: PlaneamientoBimPortafolio,
    canActivate: [roleGuard],
    data: {
      titulo: 'PLANEAMIENTO',
      featureKey: 'planeamiento-bim.portafolio',
      roles: [Roles.ADMINISTRADOR_SISTEMA, Roles.ADMINISTRADOR_UDP],
    },
  },
  {
    path: 'planeamiento-bim/configuracion-inicial',
    component: ConfiguracionInicial,
    canActivate: [roleGuard],
    data: { titulo: 'PLANEAMIENTO', featureKey: 'planeamiento-bim.configuracion-inicial' },
  },
  {
    path: 'planeamiento-bim/carga-diaria',
    component: CargaDiaria,
    canActivate: [roleGuard],
    data: { titulo: 'PLANEAMIENTO', featureKey: 'planeamiento-bim.configuracion-inicial' },
  },
  {
    path: 'planeamiento-bim/restricciones',
    component: Restricciones,
    canActivate: [roleGuard],
    data: { titulo: 'PLANEAMIENTO', featureKey: 'planeamiento-bim.configuracion-inicial' },
  },
  {
    path: 'planeamiento-bim/dashboard',
    component: PlaneamientoBimDashboard,
    canActivate: [roleGuard],
    data: { titulo: 'PLANEAMIENTO', featureKey: 'planeamiento-bim.configuracion-inicial' },
  },
  {
    path: 'projects-dashboard',
    component: ProjectsDashboard,
    canActivate: [roleGuard],
    data: { titulo: 'DASHBOARD DE PROYECTOS', featureKey: 'projects.projects-dashboard' },
  },
  {
    path: 'cronograma-actividades',
    component: ProyectosCronogramaList,
    canActivate: [roleGuard],
    data: { titulo: 'CRONOGRAMA DE ACTIVIDADES', featureKey: 'projects.cronograma-actividades' },
  },
  {
    path: 'cronograma-actividades/:proyectoId',
    component: CronogramaActividades,
    canActivate: [roleGuard],
    data: { titulo: 'CRONOGRAMA DE ACTIVIDADES', featureKey: 'projects.cronograma-actividades' },
  },
  {
    path: 'cronograma-dashboard',
    component: CronogramaDashboard,
    canActivate: [roleGuard],
    data: { titulo: 'DASHBOARD UDP', featureKey: 'projects.cronograma-dashboard' },
  },
  {
    // Landing por defecto de Actas de Reunión: dashboard personal de "mis acuerdos".
    path: 'actas-reunion',
    component: ActasReunionDashboard,
    canActivate: [roleGuard],
    data: { titulo: 'MIS ACUERDOS', featureKey: 'projects.actas-reunion' },
  },
  {
    // Antes de `actas-reunion/:reunionId` para que el parámetro no capture "lista".
    path: 'actas-reunion/lista',
    component: ActasReunion,
    canActivate: [roleGuard],
    data: { titulo: 'ACTAS DE REUNIÓN', featureKey: 'projects.actas-reunion' },
  },
  {
    // Antes de `actas-reunion/:reunionId` para que el parámetro no capture "configuracion".
    path: 'actas-reunion/configuracion',
    component: ActasReunionConfiguracion,
    canActivate: [roleGuard],
    data: { titulo: 'CONFIGURACIÓN DE ACTAS DE REUNIÓN', featureKey: 'projects.actas-reunion' },
  },
  {
    // Antes de `actas-reunion/:reunionId` para que el parámetro no capture "acuerdos".
    path: 'actas-reunion/acuerdos',
    component: AcuerdosBusqueda,
    canActivate: [roleGuard],
    data: { titulo: 'ACUERDOS', featureKey: 'projects.actas-reunion' },
  },
  {
    // Antes de `actas-reunion/:reunionId` por especificidad (mismo motivo que "configuracion").
    path: 'actas-reunion/:reunionId/agenda',
    component: ReunionAgenda,
    canActivate: [roleGuard],
    data: { titulo: 'AGENDA DE REUNIÓN', featureKey: 'projects.actas-reunion' },
  },
  {
    // No usa :reunionId (el id que trae es el de reunion_acuerdo_responsable): va antes de
    // `actas-reunion/:reunionId` para que "acuerdo" no se capture como si fuera un id de reunión.
    path: 'actas-reunion/acuerdo/:id',
    component: AcuerdoDecision,
    canActivate: [roleGuard],
    data: { titulo: 'ACUERDO DE REUNIÓN', featureKey: 'projects.actas-reunion' },
  },
  {
    path: 'actas-reunion/:reunionId',
    component: ReunionDetail,
    canActivate: [roleGuard],
    data: { titulo: 'ACTA DE REUNIÓN', featureKey: 'projects.actas-reunion' },
  },
  {
    path: 'technical-inspection-visit',
    component: IvtControl,
    canActivate: [roleGuard],
    data: { titulo: 'CONTROL DE IVTS', featureKey: 'projects.ivt-control' },
  },
  {
    path: 'construction-logbook',
    component: ConstructionLogbookControl,
    canActivate: [roleGuard],
    data: { titulo: 'CONTROL DE CUADERNO DE OBRA', featureKey: 'projects.construction-logbook' },
  },
  {
    path: 'report-response-control',
    component: ReportResponseControl,
    canActivate: [roleGuard],
    data: { titulo: 'CONTROL DE RESPUESTA DE INFORMES', featureKey: 'projects.report-response-control' },
  },
  {
    path: 'resident-monitoring-measurement',
    component: ResidentMonitoringMeasurement,
    canActivate: [roleGuard],
    data: { titulo: 'SEGUIMIENTO Y MEDICIÓN DE RESIDENTES POR PROYECTO', featureKey: 'projects.resident-monitoring-measurement' },
  },
  {
    path: 'configuration',
    loadChildren: () =>
      import('./configuration/configuracion-module').then((x) => x.ConfiguracionModule),
  },
];
