import { Routes } from '@angular/router';

export const HORAS_HOMBRE_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/horas-hombre-dashboard').then((m) => m.HorasHombreDashboard),
  },
  {
    path: 'tabla',
    loadComponent: () =>
      import('./pages/tabla/horas-hombre-tabla').then((m) => m.HorasHombreTabla),
  },
];
