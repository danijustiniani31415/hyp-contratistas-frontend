import { Routes } from '@angular/router';
import { roleGuard } from '../../../../core/guards/role.guard';

export const RAC_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/rac-dashboard').then((m) => m.RacDashboard),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.rac.dashboard' },
  },
  {
    path: 'lista',
    loadComponent: () => import('./pages/lista/rac-lista').then((m) => m.RacLista),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.rac.lista' },
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/nuevo/rac-nuevo').then((m) => m.RacNuevo),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.rac.crear' },
  },
  {
    path: 'penalidades',
    loadComponent: () =>
      import('./pages/penalidades/rac-penalidades').then((m) => m.RacPenalidades),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.rac.penalidades' },
  },
  {
    path: ':id/cerrar',
    loadComponent: () => import('./pages/cerrar/rac-cerrar').then((m) => m.RacCerrar),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.rac.cerrar' },
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/detalle/rac-detalle').then((m) => m.RacDetalle),
    canActivate: [roleGuard],
    data: { featureKey: 'ssoma.gestion.rac.detalle' },
  },
];
