import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const VECINOS_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard-vecinos/components/dashboard-vecinos').then((m) => m.DashboardVecinos),
    canActivate: [roleGuard],
    data: { titulo: 'DASHBOARD DE VECINOS', featureKey: 'vecinos.dashboard' },
  },
  {
    path: 'gestion',
    loadComponent: () =>
      import('./gestion-vecinos/components/gestion-vecinos').then((m) => m.GestionVecinos),
    canActivate: [roleGuard],
    data: { titulo: 'GESTIÓN DE VECINOS', featureKey: 'vecinos.gestion' },
  },
  {
    path: 'croquis',
    loadComponent: () => import('./croquis/components/croquis').then((m) => m.Croquis),
    canActivate: [roleGuard],
    data: { titulo: 'CROQUIS', featureKey: 'vecinos.croquis' },
  },
  {
    path: 'control-licencias',
    loadComponent: () =>
      import('./control-licencias/components/control-licencias').then(
        (m) => m.ControlLicencias,
      ),
    canActivate: [roleGuard],
    data: { titulo: 'CONTROL DE LICENCIAS', featureKey: 'vecinos.control-licencias' },
  },
];
