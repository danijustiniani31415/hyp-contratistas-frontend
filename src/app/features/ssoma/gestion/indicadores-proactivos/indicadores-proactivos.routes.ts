import { Routes } from '@angular/router';

export const INDICADORES_PROACTIVOS_ROUTES: Routes = [
  { path: '', redirectTo: 'indicadores-ssoma', pathMatch: 'full' },
  {
    path: 'indicadores-ssoma',
    loadComponent: () =>
      import('./pages/indicadores-ssoma/indicadores-ssoma.component').then(
        (m) => m.IndicadoresSsomaComponent,
      ),
    children: [
      { path: '', redirectTo: 'seguimiento', pathMatch: 'full' },
      {
        path: 'seguimiento',
        loadComponent: () =>
          import('./pages/seguimiento/seguimiento-indicadores.component').then(
            (m) => m.SeguimientoIndicadoresComponent,
          ),
        data: { titulo: 'SEGUIMIENTO DE INDICADORES PROACTIVOS' },
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard-acumulado/dashboard-acumulado.component').then(
            (m) => m.DashboardAcumuladoComponent,
          ),
        data: { titulo: 'DASHBOARD SSOMA' },
      },
      {
        path: 'dashboard-proyecto',
        loadComponent: () =>
          import('./pages/dashboard-proyecto/dashboard-proyecto.component').then(
            (m) => m.DashboardProyectoComponent,
          ),
        data: { titulo: 'DASHBOARD POR PROYECTO' },
      },
      {
        path: 'desempeno-supervisor',
        loadComponent: () =>
          import('./pages/desempeno-supervisor/desempeno-supervisor.component').then(
            (m) => m.DesempenoSupervisorComponent,
          ),
        data: { titulo: 'DESEMPEÑO DEL SUPERVISOR' },
      },
      {
        path: 'reactivos',
        loadComponent: () =>
          import('./pages/reactivos/reactivos.component').then((m) => m.ReactivosComponent),
        data: { titulo: 'INDICADORES REACTIVOS IF/IG/IA' },
      },
    ],
  },
];

export default INDICADORES_PROACTIVOS_ROUTES;
