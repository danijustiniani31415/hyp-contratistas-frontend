import { Routes } from '@angular/router';
import { roleGuard } from '../../../../core/guards/role.guard';
import { PasoDashboardComponent } from './pages/dashboard/paso-dashboard.component';
import { PasoListaComponent } from './pages/lista/paso-lista.component';
import { PasoActividadDetalleComponent } from './pages/actividad-detalle/paso-actividad-detalle.component';
import { PasoAlertasComponent } from './pages/alertas/paso-alertas.component';

export const PASO_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: PasoDashboardComponent,
    canActivate: [roleGuard],
    data: { titulo: '', featureKey: 'ssoma.gestion.paso' },
  },
  {
    path: 'lista',
    component: PasoListaComponent,
    canActivate: [roleGuard],
    data: { titulo: '', featureKey: 'ssoma.gestion.paso' },
  },
  {
    path: 'alertas',
    component: PasoAlertasComponent,
    canActivate: [roleGuard],
    data: { titulo: '', featureKey: 'ssoma.gestion.paso' },
  },
  {
    path: 'actividad/:id',
    component: PasoActividadDetalleComponent,
    canActivate: [roleGuard],
    data: { titulo: '', featureKey: 'ssoma.gestion.paso' },
  },
];
