import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Milestones } from './pages/milestones/milestones';
import { roleGuard } from '../../../core/guards/role.guard';

const routes: Routes = [
  {
    path: 'milestones',
    component: Milestones,
    canActivate: [roleGuard],
    data: { titulo: 'CONFIGURACIONES', featureKey: 'projects.config.milestones' },
  },
  { path: '', redirectTo: 'milestones', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConfiguracionRoutingModule {}
