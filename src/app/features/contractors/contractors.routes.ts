import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

/** Rutas públicas (sin layout) — registro de contratistas externos.
 *  Modo contratista: el logo es OBLIGATORIO (ver ContractorRegistration.modoInterno). */
export const CONTRACTORS_ROUTES: Routes = [
  {
    path: 'registro',
    loadComponent: () =>
      import('./contractor-registration/components/contractor-registration')
      .then(m => m.ContractorRegistration)
  }
];

/** Rutas protegidas (dentro del layout con auth) — gestión interna */
export const CONTRACTORS_ADMIN_ROUTES: Routes = [
  {
    // Mismo componente que la ruta pública, pero en "modo interno": va dentro del
    // shell autenticado (sidebar + header con pestañas) y el logo es OPCIONAL.
    // Lo usa el personal del sistema para registrar contratistas por ellos.
    path: 'registro-interno',
    loadComponent: () =>
      import('./contractor-registration/components/contractor-registration')
      .then(m => m.ContractorRegistration),
    canActivate: [roleGuard],
    data: { titulo: 'REGISTRO DE CONTRATISTAS', featureKey: 'contractors.registro', modoInterno: true },
  },
  {
    path: 'management',
    loadComponent: () =>
      import('./contractor-management/components/contractor-management')
      .then(m => m.ContractorManagement),
    canActivate: [roleGuard],
    data: { titulo: 'HOMOLOGACIÓN DE CONTRATISTAS', featureKey: 'contractors.management' },
  }
];