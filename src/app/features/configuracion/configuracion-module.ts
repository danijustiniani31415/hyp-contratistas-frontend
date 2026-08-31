import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Proyectos } from './features/proyectos/components/proyectos';
import { Area } from './features/area/components/area';
import { Companies } from './pages/companies/companies';
import { Workers } from './pages/workers/workers';
import { Feriados } from './features/feriados/components/feriados';
import { Aprendizaje } from './features/aprendizaje/components/aprendizaje';
// Revisores de áreas: define el jefe de cada área para toda la organización, por lo que
// es configuración global (antes vivía bajo Gestión Administrativa, solo para salidas).
// Los archivos siguen físicamente en `gestion-administrativa/features/configuracion/`
// hasta que se refactoricen.
// El jefe por trabajador ya no se configura acá: se asigna con el checkbox
// "Jefe personalizado" del formulario de Gestión de Ingresos → Trabajadores.
import { RevisoresAreas } from '../gestion-administrativa/features/configuracion/revisores-areas/pages/revisores-areas';
import { roleGuard } from '../../core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'proyectos', pathMatch: 'full' },
      {
        path: 'proyectos',
        component: Proyectos,
        canActivate: [roleGuard],
        data: { titulo: 'PROYECTOS', featureKey: 'configuracion.proyectos' },
      },
      {
        path: 'area',
        component: Area,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - ÁREAS', featureKey: 'configuracion.area' },
      },
      {
        path: 'companies',
        component: Companies,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - RAZONES SOCIALES', featureKey: 'configuracion.companies' },
      },
      {
        path: 'workers',
        component: Workers,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - LISTA DE TRABAJADORES', featureKey: 'configuracion.workers' },
      },
      // Categorías y Puestos se movió a Gestión GTH → Configuración: son datos maestros del
      // catálogo de trabajadores que administra GTH, no configuración global. La ruta se
      // conserva como redirect para no romper enlaces guardados.
      {
        path: 'categorias-puestos',
        redirectTo: '/gestion-gth/configuracion/categorias-puestos',
        pathMatch: 'full',
      },
      // La antigua "Revisores de Trabajadores" (revisor-salidas) se retiró: el jefe
      // personalizado se asigna ahora en el formulario de trabajadores. La ruta redirige a
      // Revisores de Áreas para no dejar enlaces rotos.
      { path: 'revisor-salidas', redirectTo: 'revisores-areas', pathMatch: 'full' },
      {
        path: 'revisores-areas',
        component: RevisoresAreas,
        canActivate: [roleGuard],
        data: {
          titulo: 'CONFIGURACIÓN - REVISORES DE ÁREAS',
          featureKey: 'configuracion.revisores-areas',
        },
      },
      {
        path: 'feriados',
        component: Feriados,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - FERIADOS Y DÍAS NO LABORABLES', featureKey: 'configuracion.feriados' },
      },
      {
        path: 'aprendizaje',
        component: Aprendizaje,
        canActivate: [roleGuard],
        data: { titulo: 'CONFIGURACIÓN - CENTRO DE APRENDIZAJE', featureKey: 'configuracion.aprendizaje' },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), CommonModule],
  exports: [RouterModule],
})
export class ConfiguracionModule {}
