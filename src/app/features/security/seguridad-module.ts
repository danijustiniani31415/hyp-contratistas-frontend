import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Users } from './pages/users/users';
import { Roles } from './pages/roles/roles';
import { roleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        path: 'users',
        children: [
          {
            path: '',
            component: Users,
            canActivate: [roleGuard],
            data: { titulo: 'USUARIOS', featureKey: 'security.users' },
          },
        ],
      },
      {
        path: 'roles',
        children: [
          {
            path: '',
            component: Roles,
            canActivate: [roleGuard],
            data: { titulo: 'ROLES', featureKey: 'security.roles' },
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule, Users, Roles],
  exports: [RouterModule],
})
export class SeguridadModule {}
