import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { GestionHabComponent } from './gestion/gestion-hab.component';
import { Roles } from '../../core/constants/roles';

export const HABILITACION_ROUTES: Routes = [
  // Redirect raíz: contratistas van a su panel, admins al shell de gestión
  { path: '', redirectTo: 'gestion', pathMatch: 'full' },

  // ── Shell de Gestión (admin) con tabs internos ────────────
  {
    path: 'gestion',
    component: GestionHabComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard-hab.component').then((m) => m.DashboardHabComponent),
        data: { titulo: 'DASHBOARD HABILITACIÓN' },
      },
      {
        path: 'trabajadores',
        loadComponent: () =>
          import('./pages/trabajadores/trabajadores').then((m) => m.Trabajadores),
        canActivate: [roleGuard],
        data: { titulo: '', hideHeader: true, featureKey: 'habilitacion.trabajadores', roles: ['CONTRATISTA'] },
      },
      {
        path: 'empresa',
        loadComponent: () =>
          import('./pages/empresa/empresa').then((m) => m.Empresa),
        canActivate: [roleGuard],
        data: { titulo: 'HABILITACIÓN - EMPRESA', featureKey: 'habilitacion.empresa' },
      },
      {
        path: 'equipos',
        loadComponent: () =>
          import('./pages/equipos/equipos').then((m) => m.Equipos),
        canActivate: [roleGuard],
        data: { titulo: 'HABILITACIÓN - EQUIPOS Y MÁQUINAS', featureKey: 'habilitacion.equipos' },
      },
      {
        path: 'equipos/catalogo',
        loadComponent: () =>
          import('./pages/catalogo-equipos/catalogo-equipos').then((m) => m.CatalogoEquipos),
        canActivate: [roleGuard],
        data: { titulo: 'CATÁLOGO DE EQUIPOS', featureKey: 'habilitacion.catalogos.equipos' },
      },
      {
        path: 'bandeja',
        loadComponent: () =>
          import('./pages/bandeja/bandeja').then((m) => m.Bandeja),
        canActivate: [roleGuard],
        data: { titulo: '', featureKey: 'habilitacion.bandeja' },
      },
      {
        path: 'sctr-vidaley',
        loadComponent: () =>
          import('./pages/sctr-vidaley/sctr-vidaley').then((m) => m.SctrVidaley),
        canActivate: [roleGuard],
        data: { titulo: 'HABILITACIÓN - SCTR Y VIDA LEY', featureKey: 'habilitacion.sctr-vidaley' },
      },
      {
        path: 'inducciones',
        loadComponent: () =>
          import('./pages/inducciones/inducciones').then((m) => m.Inducciones),
        canActivate: [roleGuard],
        data: { titulo: 'HABILITACIÓN - INDUCCIONES', featureKey: 'habilitacion.inducciones', roles: ['CONTRATISTA'] },
      },
      {
        path: 'dossier',
        loadComponent: () =>
          import('./pages/dossier/dossier').then((m) => m.Dossier),
        canActivate: [authGuard],
        data: { titulo: 'HABILITACIÓN - DOSSIER SEMANAL' },
      },
      {
        path: 'responsables',
        loadComponent: () =>
          import('./pages/responsables/responsables').then((m) => m.Responsables),
        canActivate: [authGuard, roleGuard],
        data: {
          titulo: 'HABILITACIÓN - GESTIÓN DE RESPONSABLES',
          roles: [Roles.ADMINISTRADOR_SSOMA, Roles.ADMINISTRADOR_ADMINISTRACION],
        },
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/dashboard-contratista/components/contratista-usuarios/contratista-usuarios').then(
            (m) => m.ContratistaUsuarios,
          ),
        canActivate: [authGuard],
        data: { titulo: 'HABILITACIÓN - USUARIOS' },
      },
      {
        path: 'admin-usuarios',
        loadComponent: () =>
          import('./pages/admin-contratista-usuarios/admin-contratista-usuarios').then(
            (m) => m.AdminContratistaUsuarios,
          ),
        canActivate: [authGuard],
        data: { titulo: 'HABILITACIÓN - GESTIÓN USUARIOS CONTRATISTA' },
      },
    ],
  },

  // ── Rutas originales mantenidas como alias ─────────────────
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard-hab.component').then((m) => m.DashboardHabComponent),
    canActivate: [authGuard],
    data: { titulo: 'DASHBOARD HABILITACIÓN' },
  },
  {
    path: 'dashboard-contratista',
    loadComponent: () =>
      import('./pages/dashboard-contratista/dashboard-contratista').then(
        (m) => m.DashboardContratista,
      ),
    canActivate: [authGuard],
    data: { titulo: 'HABILITACIÓN - PANEL CONTRATISTA' },
  },
  {
    path: 'trabajadores',
    loadComponent: () =>
      import('./pages/trabajadores/trabajadores').then((m) => m.Trabajadores),
    canActivate: [authGuard, roleGuard],
    data: { titulo: '', hideHeader: true, featureKey: 'habilitacion.trabajadores', roles: ['CONTRATISTA'] },
  },
  {
    path: 'empresa',
    loadComponent: () => import('./pages/empresa/empresa').then((m) => m.Empresa),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'HABILITACIÓN - EMPRESA', featureKey: 'habilitacion.empresa' },
  },
  {
    path: 'equipos',
    loadComponent: () => import('./pages/equipos/equipos').then((m) => m.Equipos),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'HABILITACIÓN - EQUIPOS Y MÁQUINAS', featureKey: 'habilitacion.equipos' },
  },
  {
    path: 'bandeja',
    loadComponent: () => import('./pages/bandeja/bandeja').then((m) => m.Bandeja),
    canActivate: [authGuard, roleGuard],
    data: { titulo: '', featureKey: 'habilitacion.bandeja' },
  },
  {
    path: 'sctr-vidaley',
    loadComponent: () =>
      import('./pages/sctr-vidaley/sctr-vidaley').then((m) => m.SctrVidaley),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'HABILITACIÓN - SCTR Y VIDA LEY', featureKey: 'habilitacion.sctr-vidaley' },
  },
  {
    path: 'inducciones',
    loadComponent: () =>
      import('./pages/inducciones/inducciones').then((m) => m.Inducciones),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'HABILITACIÓN - INDUCCIONES', featureKey: 'habilitacion.inducciones', roles: ['CONTRATISTA'] },
  },
  {
    path: 'dossier',
    loadComponent: () =>
      import('./pages/dossier/dossier').then((m) => m.Dossier),
    canActivate: [authGuard],
    data: { titulo: 'HABILITACIÓN - DOSSIER SEMANAL' },
  },
  {
    path: 'registros-modelo',
    loadComponent: () =>
      import('./pages/registros-modelo/registros-modelo').then((m) => m.RegistrosModelo),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'HABILITACIÓN - REGISTROS MODELO', featureKey: 'habilitacion.registros-modelo', roles: ['CONTRATISTA'] },
  },
  {
    path: 'evaluacion-supervisores',
    loadComponent: () =>
      import('./pages/evaluacion-supervisores/evaluacion-supervisores').then(
        (m) => m.EvaluacionSupervisores,
      ),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'HABILITACIÓN - EVALUACIÓN SUPERVISORES', featureKey: 'habilitacion.evaluacion-supervisores' },
  },
  {
    path: 'auditoria',
    loadComponent: () => import('./pages/auditoria/auditoria').then((m) => m.Auditoria),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'HABILITACIÓN - AUDITORÍA', featureKey: 'habilitacion.auditoria' },
  },
  {
    path: 'reglas',
    loadComponent: () => import('./pages/reglas/reglas').then((m) => m.Reglas),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'HABILITACIÓN - REGLAS DE ENTREGABLES', featureKey: 'habilitacion.reglas' },
  },
  {
    path: 'control-acceso',
    loadComponent: () =>
      import('./pages/control-acceso/control-acceso').then((m) => m.ControlAcceso),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'HABILITACIÓN - CONTROL DE ACCESO', featureKey: 'habilitacion.control-acceso' },
  },
  {
    path: 'clinicas',
    loadComponent: () =>
      import('./pages/clinicas/clinicas').then((m) => m.Clinicas),
    canActivate: [authGuard],
    data: { titulo: 'HABILITACIÓN - CLÍNICAS' },
  },
  {
    path: 'clinicas/:id',
    loadComponent: () =>
      import('./pages/clinicas/detalle/clinica-detalle').then((m) => m.ClinicaDetalle),
    canActivate: [authGuard],
    data: { titulo: 'HABILITACIÓN - DETALLE CLÍNICA' },
  },
  {
    path: 'admin-usuarios-contratista',
    loadComponent: () =>
      import('./pages/admin-contratista-usuarios/admin-contratista-usuarios').then(
        (m) => m.AdminContratistaUsuarios,
      ),
    canActivate: [authGuard],
    data: { titulo: 'HABILITACIÓN - GESTIÓN USUARIOS CONTRATISTA' },
  },
  {
    path: 'evaluar-prevencionista',
    loadComponent: () =>
      import('./pages/evaluar-prevencionista/evaluar-prevencionista').then((m) => m.EvaluarPrevencionista),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'HABILITACIÓN - EVALUAR SSOMA', roles: ['CONTRATISTA'] },
  },
  {
    path: 'mi-perfil-supervisor',
    loadComponent: () =>
      import('./pages/mi-perfil-supervisor/mi-perfil-supervisor').then((m) => m.MiPerfilSupervisor),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'HABILITACIÓN - MI DESEMPEÑO SSOMA', roles: ['CONTRATISTA'] },
  },
  {
    path: 'cambiar-password',
    loadComponent: () =>
      import('./pages/cambiar-password/cambiar-password').then((m) => m.CambiarPassword),
    canActivate: [authGuard, roleGuard],
    data: { titulo: 'CAMBIAR CONTRASEÑA', roles: ['CONTRATISTA'] },
  },
];
