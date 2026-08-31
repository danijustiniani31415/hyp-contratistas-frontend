import { Routes } from '@angular/router';
import { roleGuard } from '../../../../core/guards/role.guard';

export const PETS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/lista/pets-lista').then((m) => m.PetsLista),
    canActivate: [roleGuard],
    data: { titulo: 'PETS', featureKey: 'ssoma.gestion.pets' },
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/detalle/pets-detalle').then((m) => m.PetsDetalle),
    canActivate: [roleGuard],
    data: { titulo: 'PETS — DETALLE', featureKey: 'ssoma.gestion.pets' },
  },
];
