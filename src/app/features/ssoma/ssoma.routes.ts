import { Routes } from '@angular/router';

export const SSOMA_ROUTES: Routes = [
  {
    path: 'salud-ocupacional',
    loadChildren: () =>
      import('./salud-ocupacional/salud-ocupacional.routes').then(
        (m) => m.SALUD_OCUPACIONAL_ROUTES,
      ),
  },
  {
    path: 'gestion/paso',
    loadChildren: () =>
      import('./salud-ocupacional/paso/paso.routes').then((m) => m.PASO_ROUTES),
  },
  {
    path: 'gestion/rac',
    loadChildren: () =>
      import('./gestion/rac/rac.routes').then((m) => m.RAC_ROUTES),
  },
  {
    path: 'gestion/opt',
    loadChildren: () =>
      import('./gestion/opt/opt.routes').then((m) => m.OPT_ROUTES),
  },
  {
    path: 'gestion/pets',
    loadChildren: () =>
      import('./gestion/pets/pets.routes').then((m) => m.PETS_ROUTES),
  },
  {
    path: 'gestion/inspeccion',
    loadChildren: () =>
      import('./gestion/inspeccion/inspeccion.routes').then((m) => m.INSPECCION_ROUTES),
  },
  {
    path: 'gestion/auditoria-ats',
    loadChildren: () =>
      import('./gestion/auditoria-ats/auditoria-ats.routes').then((m) => m.AUDITORIA_ATS_ROUTES),
  },
  {
    path: 'gestion/charlas',
    loadChildren: () =>
      import('./gestion/charlas/charlas.routes').then((m) => m.CHARLAS_ROUTES),
  },
  {
    path: 'gestion/accidentes-incidentes',
    loadChildren: () =>
      import('./gestion/accidentes-incidentes/accidente-incidente.routes').then(
        (m) => m.ACCIDENTE_INCIDENTE_ROUTES,
      ),
  },
  {
    path: 'gestion/amonestaciones',
    loadChildren: () =>
      import('./gestion/amonestaciones/amonestaciones.routes').then(
        (m) => m.AMONESTACIONES_ROUTES,
      ),
  },
  {
    path: 'gestion/indicadores-proactivos',
    loadChildren: () =>
      import('./gestion/indicadores-proactivos/indicadores-proactivos.routes').then(
        (m) => m.INDICADORES_PROACTIVOS_ROUTES,
      ),
  },
  {
    path: 'gestion/checklist',
    loadChildren: () =>
      import('./gestion/checklist/checklist.routes').then((m) => m.CHECKLIST_ROUTES),
  },
  {
    path: 'gestion/proyectos-habilitados',
    loadChildren: () =>
      import('./gestion/proyectos-habilitados/proyectos-habilitados.routes').then(
        (m) => m.PROYECTOS_HABILITADOS_ROUTES,
      ),
  },
  {
    path: 'gestion/horas-hombre',
    loadChildren: () =>
      import('./gestion/horas-hombre/horas-hombre.routes').then((m) => m.HORAS_HOMBRE_ROUTES),
  },
  {
    path: 'gestion/programacion-inducciones',
    loadChildren: () =>
      import('./gestion/programacion-inducciones/programacion-inducciones.routes').then(
        (m) => m.PROGRAMACION_INDUCCIONES_ROUTES,
      ),
  },
  {
    path: 'gestion/presupuesto-materiales',
    loadChildren: () =>
      import('./gestion/presupuesto-materiales/presupuesto.routes').then(
        (m) => m.PRESUPUESTO_MATERIALES_ROUTES,
      ),
  },
  { path: '', redirectTo: 'salud-ocupacional', pathMatch: 'full' },
];
