import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Dashboard } from './dashboard/dashboard';
import { Actividades } from './actividades/actividades';
import { Entregables } from './entregables/entregables';
import { Gantt } from './gantt/gantt';
import { Plantilla } from './plantilla/plantilla';
import { TareoMarcar } from './tareo/marcar/marcar';
import { TareoEnrolamiento } from './tareo/enrolamiento/enrolamiento';
import { TareoEnrolamientoAsistido } from './tareo/enrolamiento-asistido/enrolamiento-asistido';
import { TareoRevision } from './tareo/revision/revision';
import { TareoReporteSemanal } from './tareo/reporte-semanal/reporte-semanal';
import { TareoGestionPermisos } from './tareo/gestion-permisos/gestion-permisos';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: Dashboard,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - DASHBOARD', featureKey: 'arquitectura-comercial.dashboard', hideHeader: true },
      },
      {
        path: 'actividades',
        component: Actividades,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - ACTIVIDADES', featureKey: 'arquitectura-comercial.actividades' },
      },
      {
        path: 'entregables',
        component: Entregables,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - ENTREGABLES', featureKey: 'arquitectura-comercial.entregables' },
      },
      {
        path: 'gantt',
        component: Gantt,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - GANTT', featureKey: 'arquitectura-comercial.gantt' },
      },
      {
        path: 'plantilla',
        component: Plantilla,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - PLANTILLA', featureKey: 'arquitectura-comercial.plantilla' },
      },
      { path: 'tareo', redirectTo: 'tareo/marcar', pathMatch: 'full' },
      {
        path: 'tareo/marcar',
        component: TareoMarcar,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - TAREO', featureKey: 'arquitectura-comercial.tareo.marcar' },
      },
      {
        path: 'tareo/enrolamiento',
        component: TareoEnrolamiento,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - ENROLAMIENTO', featureKey: 'arquitectura-comercial.tareo.enrolamiento' },
      },
      {
        path: 'tareo/enrolamiento-asistido',
        component: TareoEnrolamientoAsistido,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - ENROLAMIENTO', featureKey: 'arquitectura-comercial.tareo.enrolamiento' },
      },
      {
        path: 'tareo/revision',
        component: TareoRevision,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - REVISIÓN DE TAREO', featureKey: 'arquitectura-comercial.tareo.revision' },
      },
      {
        path: 'tareo/reporte',
        component: TareoReporteSemanal,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - REPORTE DE TAREO', featureKey: 'arquitectura-comercial.tareo.reporte' },
      },
      {
        path: 'tareo/gestion-permisos',
        component: TareoGestionPermisos,
        canActivate: [roleGuard],
        data: { titulo: 'ARQUITECTURA COMERCIAL - GESTIÓN DE PERMISOS', featureKey: 'arquitectura-comercial.tareo.gestion-permisos' },
      },
      {
        path: 'observaciones',
        loadChildren: () =>
          import('./observaciones/observaciones.routes').then((m) => m.OBSERVACIONES_ROUTES),
      },
      {
        path: 'revisiones',
        loadChildren: () =>
          import('./revisiones/revisiones.routes').then((m) => m.REVISIONES_ROUTES),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ArquitecturaComercialRoutingModule { }
