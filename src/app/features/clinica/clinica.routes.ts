import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const CLINICA_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.ClinicaDashboard),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'CLÍNICA', featureKey: 'clinica.agenda', roles: ['CLINICA'], blockedTipos: ['CONTRATISTA'] },
  },
  {
    path: 'agenda',
    loadComponent: () => import('./pages/agenda/agenda').then(m => m.Agenda),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'CLÍNICA - AGENDA DEL DÍA', featureKey: 'clinica.agenda', roles: ['CLINICA'], blockedTipos: ['CONTRATISTA'] },
  },
  {
    path: 'programaciones',
    loadComponent: () =>
      import('./pages/programaciones/programaciones').then(m => m.ProgramacionesClinica),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'CLÍNICA - PROGRAMACIONES', featureKey: 'clinica.programaciones', roles: ['CLINICA'], blockedTipos: ['CONTRATISTA'] },
  },
  {
    path: 'interconsultas',
    loadComponent: () =>
      import('./pages/interconsultas/interconsultas').then(m => m.InterconsultasClinica),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'CLÍNICA - INTERCONSULTAS', featureKey: 'clinica.agenda', roles: ['CLINICA'], blockedTipos: ['CONTRATISTA'] },
  },
  {
    path: 'emos',
    loadComponent: () => import('./pages/emos/emos').then(m => m.ClinicaEmos),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'CLÍNICA - CONTROL DE EMOs', featureKey: 'clinica.agenda', roles: ['CLINICA'], blockedTipos: ['CONTRATISTA'] },
  },
];
