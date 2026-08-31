import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { Roles } from '../../core/constants/roles';

export const CONTABILIDAD_ROUTES: Routes = [
  { path: '', redirectTo: 'facturas', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((m) => m.FacturasDashboard),
    canActivate: [roleGuard],
    data: {
      titulo: 'DASHBOARD',
      featureKey: 'accounting.dashboard',
      roles: [Roles.CONTABILIDAD_USUARIO, Roles.ADMINISTRADOR_SISTEMA],
    },
  },
  {
    path: 'facturas',
    loadComponent: () =>
      import('./features/facturas/components/facturas').then((m) => m.Facturas),
    canActivate: [roleGuard],
    data: {
      titulo: 'FACTURAS',
      featureKey: 'accounting.invoices',
      roles: [Roles.CONTABILIDAD_USUARIO, Roles.ADMINISTRADOR_SISTEMA],
    },
  },
  {
    path: 'configuracion',
    loadComponent: () =>
      import('./features/configuration/contabilidad-configuracion').then((m) => m.ContabilidadConfiguracion),
    canActivate: [roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN',
      featureKey: 'accounting.configuration',
      roles: [Roles.CONTABILIDAD_USUARIO, Roles.ADMINISTRADOR_SISTEMA],
    },
  },
];
