import { Routes } from '@angular/router';
import { roleGuard } from '../../../../core/guards/role.guard';

export const OPT_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/opt-dashboard').then((m) => m.OptDashboard),
    canActivate: [roleGuard],
    data: { titulo: 'OPT — DASHBOARD', featureKey: 'ssoma.gestion.opt.dashboard' },
  },
  {
    path: 'lista',
    loadComponent: () => import('./pages/lista/opt-lista').then((m) => m.OptLista),
    canActivate: [roleGuard],
    data: { titulo: 'OPT — LISTA', featureKey: 'ssoma.gestion.opt.lista' },
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/nuevo/opt-nuevo').then((m) => m.OptNuevo),
    canActivate: [roleGuard],
    data: { titulo: 'NUEVA OPT', featureKey: 'ssoma.gestion.opt.nuevo' },
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/detalle/opt-detalle').then((m) => m.OptDetalle),
    canActivate: [roleGuard],
    data: { titulo: 'OPT — DETALLE', featureKey: 'ssoma.gestion.opt' },
  },
];
