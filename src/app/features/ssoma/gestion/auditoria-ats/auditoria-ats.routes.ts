import { Routes } from '@angular/router';

export const AUDITORIA_ATS_ROUTES: Routes = [
  { path: '', redirectTo: 'lista', pathMatch: 'full' },
  {
    path: 'lista',
    loadComponent: () =>
      import('./pages/lista/auditoria-ats-lista.component').then((m) => m.AuditoriaAtsListaComponent),
    data: { titulo: 'AUDITORÍA DE ATS' },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/detalle/auditoria-ats-detalle.component').then(
        (m) => m.AuditoriaAtsDetalleComponent,
      ),
    data: { titulo: 'DETALLE AUDITORÍA ATS' },
  },
];

export default AUDITORIA_ATS_ROUTES;
