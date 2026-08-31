import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/guards/role.guard';

export const REVISIONES_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/revisiones-dashboard').then((m) => m.RevisionesDashboard),
    canActivate: [roleGuard],
    data: { titulo: 'ARQUITECTURA COMERCIAL - REVISIONES - DASHBOARD', featureKey: 'arquitectura-comercial.revisiones.dashboard' },
  },
  {
    path: 'lista',
    loadComponent: () =>
      import('./pages/lista/revisiones-lista').then((m) => m.RevisionesLista),
    canActivate: [roleGuard],
    data: { titulo: 'ARQUITECTURA COMERCIAL - REVISIONES - LISTA', featureKey: 'arquitectura-comercial.revisiones.lista' },
  },
];
