import { Routes } from '@angular/router';

export const AMONESTACIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/main/amonestaciones').then((m) => m.Amonestaciones),
    data: { titulo: 'AMONESTACIONES Y SUSPENSIONES', roles: [] },
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./pages/nueva/amonestacion-nueva').then((m) => m.AmonestacionNueva),
    data: { titulo: 'GENERAR AMONESTACIÓN', roles: [] },
  },
];
