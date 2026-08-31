import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/guards/role.guard';

export const OBSERVACIONES_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/observaciones-dashboard').then((m) => m.ObservacionesDashboard),
    canActivate: [roleGuard],
    data: { titulo: 'ARQUITECTURA COMERCIAL - OBSERVACIONES - DASHBOARD', featureKey: 'arquitectura-comercial.observaciones.dashboard' },
  },
  {
    path: 'lista',
    loadComponent: () =>
      import('./pages/lista/observaciones-lista').then((m) => m.ObservacionesLista),
    canActivate: [roleGuard],
    data: { titulo: 'ARQUITECTURA COMERCIAL - OBSERVACIONES - LISTA', featureKey: 'arquitectura-comercial.observaciones.lista' },
  },
];
