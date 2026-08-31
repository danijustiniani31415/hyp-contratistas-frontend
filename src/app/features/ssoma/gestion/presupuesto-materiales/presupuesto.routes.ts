import { Routes } from '@angular/router';

export const PRESUPUESTO_MATERIALES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/presupuesto-main/presupuesto-main').then((m) => m.PresupuestoMainComponent),
    data: { titulo: 'PRESUPUESTO MATERIALES · IMPORTACIÓN', roles: [] },
  },
  {
    // La pantalla de Revisión (por proyecto) se consolidó dentro de Catálogo → Sin
    // estandarizar (global, con filtro y paginación) — se deja el redirect por si queda
    // algún enlace viejo apuntando acá.
    path: 'revision',
    redirectTo: 'catalogo',
    pathMatch: 'full',
  },
  {
    path: 'drivers',
    loadComponent: () =>
      import('./pages/drivers/drivers-page').then((m) => m.DriversPage),
    data: { titulo: 'PRESUPUESTO MATERIALES · DRIVERS', roles: [] },
  },
  {
    path: 'ratios',
    loadComponent: () =>
      import('./pages/ratios-lista/ratios-lista').then((m) => m.RatiosListaPage),
    data: { titulo: 'PRESUPUESTO MATERIALES · RATIOS', roles: [] },
  },
  {
    path: 'proyecto/:projectId',
    loadComponent: () =>
      import('./pages/proyecto/proyecto-page').then((m) => m.ProyectoPage),
    data: { titulo: 'PRESUPUESTO MATERIALES · PROYECTO', roles: [] },
  },
  {
    path: 'presupuesto/:presupuestoId',
    loadComponent: () =>
      import('./pages/presupuesto-detalle/presupuesto-detalle').then((m) => m.PresupuestoDetallePage),
    data: { titulo: 'PRESUPUESTO MATERIALES · DETALLE', roles: [] },
  },
  {
    path: 'presupuesto/:presupuestoId/control',
    loadComponent: () =>
      import('./pages/control-semana/control-semana').then((m) => m.ControlSemanaPage),
    data: { titulo: 'PRESUPUESTO MATERIALES · CONTROL SEMANAL', roles: [] },
  },
  {
    path: 'kits',
    loadComponent: () =>
      import('./pages/kits/kits-page').then((m) => m.KitsPage),
    data: { titulo: 'PRESUPUESTO MATERIALES · KITS / BOM', roles: [] },
  },
  {
    path: 'catalogo',
    loadComponent: () =>
      import('./pages/catalogo/catalogo-page').then((m) => m.CatalogoPage),
    data: { titulo: 'PRESUPUESTO MATERIALES · CATÁLOGO', roles: [] },
  },
];

export default PRESUPUESTO_MATERIALES_ROUTES;
