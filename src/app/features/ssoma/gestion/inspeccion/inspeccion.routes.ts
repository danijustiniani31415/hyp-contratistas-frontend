import { Routes } from '@angular/router';

export const INSPECCION_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/inspeccion-dashboard.component').then(
        (m) => m.InspeccionDashboardComponent,
      ),
    data: { titulo: 'INSPECCIONES' },
  },
  {
    path: 'lista',
    loadComponent: () =>
      import('./pages/lista/inspeccion-lista.component').then((m) => m.InspeccionListaComponent),
    data: { titulo: 'INSPECCIONES' },
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./pages/nueva/inspeccion-nueva.component').then((m) => m.InspeccionNuevaComponent),
    data: { titulo: 'NUEVA INSPECCIÓN' },
  },
  {
    path: 'abiertas',
    loadComponent: () =>
      import('./pages/abiertas/inspeccion-abiertas.component').then(
        (m) => m.InspeccionAbiertasComponent,
      ),
    data: { titulo: 'INSPECCIONES ABIERTAS' },
  },
  {
    path: ':id/agregar-hallazgo',
    loadComponent: () =>
      import('./pages/agregar-hallazgo/inspeccion-agregar-hallazgo.component').then(
        (m) => m.InspeccionAgregarHallazgoComponent,
      ),
    data: { titulo: 'AGREGAR HALLAZGO' },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/detalle/inspeccion-detalle.component').then(
        (m) => m.InspeccionDetalleComponent,
      ),
    data: { titulo: 'DETALLE INSPECCIÓN' },
  },
];

export default INSPECCION_ROUTES;
