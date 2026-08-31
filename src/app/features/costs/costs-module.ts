import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Adjudicaciones } from './features/adjudicaciones/components/adjudicaciones';
import { AdjudicacionesDashboard } from './features/adjudicaciones-dashboard/components/adjudicaciones-dashboard';
import { CostsConfiguration } from './features/configuration/costs-configuration';
import { roleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'adjudicaciones', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: AdjudicacionesDashboard,
        canActivate: [roleGuard],
        data: { titulo: 'DASHBOARD DE ADJUDICACIONES', featureKey: 'costs.dashboard' },
      },
      {
        path: 'adjudicaciones',
        children: [
          {
            path: '',
            component: Adjudicaciones,
            canActivate: [roleGuard],
            data: { titulo: 'ADJUDICACIONES DE SC', featureKey: 'costs.adjudicaciones' },
          },
        ],
      },
      {
        path: 'configuration',
        children: [
          // Ruta contenedora: redirige a la primera sección permitida (lógica en el componente).
          {
            path: '',
            component: CostsConfiguration,
            data: { titulo: 'CONFIGURACIÓN DE COSTOS' },
          },
          // Cada sección reutiliza el contenedor pero conserva su featureKey + roleGuard.
          {
            path: 'staff-project-email',
            component: CostsConfiguration,
            canActivate: [roleGuard],
            data: { titulo: 'CONFIGURACIÓN DE COSTOS', featureKey: 'costs.config.staff-project-email', seccion: 'staff-project-email' },
          },
          {
            path: 'work-item-category',
            component: CostsConfiguration,
            canActivate: [roleGuard],
            data: { titulo: 'CONFIGURACIÓN DE COSTOS', featureKey: 'costs.config.work-item-category', seccion: 'work-item-category' },
          },
          {
            path: 'work-item',
            component: CostsConfiguration,
            canActivate: [roleGuard],
            data: { titulo: 'CONFIGURACIÓN DE COSTOS', featureKey: 'costs.config.work-item', seccion: 'work-item' },
          },
          {
            path: 'work-specialty',
            component: CostsConfiguration,
            canActivate: [roleGuard],
            data: { titulo: 'CONFIGURACIÓN DE COSTOS', featureKey: 'costs.config.work-specialty', seccion: 'work-specialty' },
          },
          {
            path: 'project-link',
            component: CostsConfiguration,
            canActivate: [roleGuard],
            data: { titulo: 'CONFIGURACIÓN DE COSTOS', featureKey: 'costs.config.project-link', seccion: 'project-link' },
          },
          {
            path: 'adjudicacion-folder',
            component: CostsConfiguration,
            canActivate: [roleGuard],
            data: { titulo: 'CONFIGURACIÓN DE COSTOS', featureKey: 'costs.config.adjudicacion-folder', seccion: 'adjudicacion-folder' },
          },
          {
            path: 'costos-presupuestos-email',
            component: CostsConfiguration,
            canActivate: [roleGuard],
            data: { titulo: 'CONFIGURACIÓN DE COSTOS', featureKey: 'costs.config.costos-presupuestos-email', seccion: 'costos-presupuestos-email' },
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule],
  exports: [RouterModule],
})
export class CostsModule {}
