import { Routes } from '@angular/router';

export const PROGRAMACION_INDUCCIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/main/programacion-inducciones-main').then(
        (m) => m.ProgramacionInduccionesMainComponent,
      ),
    data: { titulo: 'PROGRAMACIÓN DE INDUCCIONES', roles: [] },
  },
];

export default PROGRAMACION_INDUCCIONES_ROUTES;
