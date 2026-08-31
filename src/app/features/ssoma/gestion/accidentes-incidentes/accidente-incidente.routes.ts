import { Routes } from '@angular/router';

export const ACCIDENTE_INCIDENTE_ROUTES: Routes = [
  { path: '', redirectTo: 'lista', pathMatch: 'full' },
  {
    path: 'lista',
    loadComponent: () =>
      import('./pages/lista/accidente-lista.component').then((m) => m.AccidenteListaComponent),
    data: { titulo: 'ACCIDENTES E INCIDENTES' },
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/crear-editar/accidente-crear-editar.component').then(
        (m) => m.AccidenteCrearEditarComponent,
      ),
    data: { titulo: 'NUEVO ACCIDENTE/INCIDENTE' },
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/crear-editar/accidente-crear-editar.component').then(
        (m) => m.AccidenteCrearEditarComponent,
      ),
    data: { titulo: 'EDITAR ACCIDENTE/INCIDENTE' },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/detalle/accidente-detalle.component').then(
        (m) => m.AccidenteDetalleComponent,
      ),
    data: { titulo: 'DETALLE ACCIDENTE/INCIDENTE' },
  },
];

export default ACCIDENTE_INCIDENTE_ROUTES;
