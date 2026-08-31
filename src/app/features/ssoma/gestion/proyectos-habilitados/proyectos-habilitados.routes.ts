import { Routes } from '@angular/router';

export const PROYECTOS_HABILITADOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/main/proyectos-habilitados-main').then(
        (m) => m.ProyectosHabilitadosMainComponent,
      ),
    data: { titulo: 'PROYECTOS HABILITADOS SSOMA', roles: [] },
  },
];

export default PROYECTOS_HABILITADOS_ROUTES;
