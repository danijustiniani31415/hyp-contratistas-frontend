import { Routes } from '@angular/router';
import { roleGuard } from '../../../../core/guards/role.guard';

export const CHARLAS_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./charlas-dashboard.component').then((m) => m.CharlasDashboardComponent),
    data: { titulo: 'CHARLAS Y CAPACITACIONES', tab: 1 },
  },
  {
    path: 'capacitaciones',
    loadComponent: () => import('./charlas-dashboard.component').then((m) => m.CharlasDashboardComponent),
    data: { titulo: 'CHARLAS Y CAPACITACIONES', tab: 2 },
  },
  {
    path: 'nueva',
    loadComponent: () => import('./charlas-dashboard.component').then((m) => m.CharlasDashboardComponent),
    data: { titulo: 'CHARLAS Y CAPACITACIONES', tab: 3 },
  },
  {
    path: 'gestion',
    loadComponent: () => import('./charlas-dashboard.component').then((m) => m.CharlasDashboardComponent),
    data: { titulo: 'CHARLAS Y CAPACITACIONES', tab: 4 },
  },
  {
    path: 'contratista',
    loadComponent: () => import('./pages/contratista/charlas-contratista').then((m) => m.CharlasContratista),
    data: { titulo: 'CHARLA DIARIA — CONTRATISTA' },
  },
  {
    path: 'revision-contratista',
    loadComponent: () =>
      import('./pages/revision-contratista/charlas-revision-contratista').then(
        (m) => m.CharlasRevisionContratista,
      ),
    canActivate: [roleGuard],
    data: { titulo: 'REVISIÓN CHARLAS CONTRATISTAS', featureKey: 'ssoma.charlas.aprobar' },
  },
];
