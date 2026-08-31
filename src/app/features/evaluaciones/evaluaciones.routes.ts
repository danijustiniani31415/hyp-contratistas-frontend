import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const EVALUACIONES_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard-gerencia/dashboard-gerencia').then(m => m.DashboardGerencia),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - DASHBOARD', featureKey: 'evaluaciones.dashboard' },
  },
  {
    path: 'evaluar',
    loadComponent: () =>
      import('./pages/evaluar-residente/evaluar-residente').then(m => m.EvaluarResidente),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - EVALUAR RESIDENTE', featureKey: 'evaluaciones.evaluar' },
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./pages/historial/historial').then(m => m.Historial),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - HISTORIAL', featureKey: 'evaluaciones.historial' },
  },
  {
    path: 'configuracion',
    loadComponent: () =>
      import('./pages/configuracion-plantilla/configuracion-plantilla').then(
        m => m.ConfiguracionPlantilla,
      ),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - CONFIGURACIÓN', featureKey: 'evaluaciones.configuracion' },
  },
  {
    path: 'asignaciones',
    loadComponent: () =>
      import('./asignaciones/asignaciones').then(m => m.Asignaciones),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - ASIGNACIONES', featureKey: 'evaluaciones.asignaciones' },
  },
  {
    path: 'evaluar-contratista',
    loadComponent: () =>
      import('./pages/evaluar-contratista/evaluar-contratista').then(m => m.EvaluarContratista),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - EVALUAR CONTRATISTA', featureKey: 'evaluaciones.evaluar-contratista' },
  },
  {
    path: 'ver-contratistas',
    loadComponent: () =>
      import('./pages/ver-evaluacion-contratistas/ver-evaluacion-contratistas').then(
        m => m.VerEvaluacionContratistas,
      ),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - VER EVALUACIÓN CONTRATISTAS', featureKey: 'evaluaciones.ver-contratistas' },
  },
  {
    path: 'dashboard-contratistas',
    loadComponent: () =>
      import('./pages/dashboard-contratistas/dashboard-contratistas').then(
        m => m.DashboardContratistas,
      ),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - DASHBOARD CONTRATISTAS', featureKey: 'evaluaciones.dashboard-contratistas' },
  },
  {
    path: 'evaluar-supervisor-contratista',
    loadComponent: () =>
      import('./pages/evaluar-supervisor-contratista/evaluar-supervisor-contratista').then(
        m => m.EvaluarSupervisorContratista,
      ),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - EVALUAR SUPERVISOR CONTRATISTA', featureKey: 'evaluaciones.evaluar-supervisor-contratista' },
  },
  {
    path: 'ver-supervisores-contratista',
    loadComponent: () =>
      import('./pages/ver-evaluacion-supervisores/ver-evaluacion-supervisores').then(
        m => m.VerEvaluacionSupervisores,
      ),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - VER EVALUACIÓN SUPERVISORES', featureKey: 'evaluaciones.ver-supervisores-contratista' },
  },
  {
    path: 'evaluar-jefe-ssoma',
    loadComponent: () =>
      import('./pages/evaluar-jefe-ssoma/evaluar-jefe-ssoma').then(m => m.EvaluarJefeSsoma),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - EVALUAR JEFE SSOMA', featureKey: 'evaluaciones.evaluar-jefe-ssoma' },
  },
  {
    path: 'resultados-jefe-ssoma',
    loadComponent: () =>
      import('./pages/resultados-jefe-ssoma/resultados-jefe-ssoma').then(m => m.ResultadosJefeSsoma),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - RESULTADOS JEFE SSOMA', featureKey: 'evaluaciones.resultados-jefe-ssoma' },
  },
  {
    path: 'mi-perfil-prevencionista',
    loadComponent: () =>
      import('./pages/mi-perfil-prevencionista/mi-perfil-prevencionista').then(m => m.MiPerfilPrevencionista),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - MI PERFIL PREVENCIONISTA', featureKey: 'evaluaciones.mi-perfil-prevencionista' },
  },
  {
    path: 'dashboard-prevencionistas',
    loadComponent: () =>
      import('./pages/dashboard-prevencionistas/dashboard-prevencionistas').then(m => m.DashboardPrevencionistas),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - DASHBOARD PREVENCIONISTAS', featureKey: 'evaluaciones.dashboard-prevencionistas' },
  },
  {
    path: 'gestion-ssoma',
    loadComponent: () =>
      import('./pages/gestion-ssoma/gestion-ssoma').then(m => m.GestionSsoma),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - GESTIÓN SSOMA', featureKey: 'evaluaciones.gestion-ssoma' },
  },
  {
    path: 'resultados-gestion-ssoma',
    loadComponent: () =>
      import('./pages/resultados-gestion-ssoma/resultados-gestion-ssoma').then(m => m.ResultadosGestionSsoma),
    canActivate: [roleGuard],
    data: { titulo: 'EVALUACIONES - RESULTADOS GESTIÓN SSOMA', featureKey: 'evaluaciones.resultados-gestion-ssoma' },
  },
  { path: '', redirectTo: 'evaluar', pathMatch: 'full' },
];
