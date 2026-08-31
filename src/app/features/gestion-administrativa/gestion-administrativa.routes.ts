import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { Roles } from '../../core/constants/roles';

export const GESTION_ADMINISTRATIVA_ROUTES: Routes = [
  { path: '', redirectTo: 'solicitud-salidas', pathMatch: 'full' },
  {
    path: 'solicitud-salidas',
    loadComponent: () =>
      import('./features/solicitud-salidas/components/solicitud-salidas').then(
        (m) => m.SolicitudSalidas,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'SOLICITUD DE SALIDAS',
      featureKey: 'gestion-administrativa.solicitud-salidas',
    },
  },
  {
    path: 'gestion-salidas',
    loadComponent: () =>
      import('./features/gestion-salidas/components/gestion-salidas').then(
        (m) => m.GestionSalidas,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'GESTIÓN DE SALIDAS',
      featureKey: 'gestion-administrativa.gestion-salidas',
    },
  },
  {
    path: 'delegacion-revision',
    loadComponent: () =>
      import('./features/delegacion-revision/components/delegacion-revision').then(
        (m) => m.DelegacionRevision,
      ),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'DELEGACIÓN DE REVISIÓN',
      featureKey: 'gestion-administrativa.delegacion-revision',
    },
  },
  // Contenedor de configuración: cada sección conserva su ruta, featureKey y
  // roleGuard, pero todas renderizan GaConfiguracion (que conmuta la sección
  // activa con app-section-tabs a partir de data.seccion).
  {
    path: 'configuracion',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
    },
  },
  {
    path: 'configuracion/lugares',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.lugares',
      seccion: 'lugares',
    },
  },
  {
    path: 'configuracion/motivos',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.motivos',
      seccion: 'motivos',
    },
  },
  {
    path: 'configuracion/trayectos',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.trayectos',
      seccion: 'trayectos',
    },
  },
  // Revisores de áreas se movió al módulo de configuración global (define el jefe de
  // cada área, no solo para salidas). Se mantiene la ruta antigua como redirección para
  // no romper enlaces. La de revisores por trabajador se retiró junto con su pantalla:
  // ese jefe se asigna ahora en el formulario de trabajadores (Gestión de Ingresos).
  {
    path: 'configuracion/revisores-areas',
    redirectTo: '/configuracion/revisores-areas',
    pathMatch: 'full',
  },
  {
    path: 'configuracion/visibilidad-salidas',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.visibilidad-salidas',
      seccion: 'visibilidad-salidas',
    },
  },
  {
    path: 'configuracion/carpeta-adjuntos',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.carpeta-adjuntos',
      seccion: 'carpeta-adjuntos',
    },
  },
  // "Tu firma" no se restringe por featureKey sino por rol: la firma es de la persona, no de una
  // funcionalidad, y la necesita cualquier trabajador de Abril que vaya a firmar algo (el jefe que
  // firma una planilla de rendición, pero también quien firme en otro módulo). USUARIO DE ABRIL
  // (12) es el rol base de todo empleado, así que deja fuera solo a las sesiones que no son de
  // Abril (contratistas y clínica, que tienen su propio flujo de auth).
  {
    path: 'configuracion/firma',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      seccion: 'firma',
      roles: [Roles.USUARIO_DE_ABRIL],
    },
  },
  {
    path: 'configuracion/correos',
    loadComponent: () =>
      import('./features/configuracion/ga-configuracion').then((m) => m.GaConfiguracion),
    canActivate: [authGuard, roleGuard],
    data: {
      titulo: 'CONFIGURACIÓN ADMINISTRATIVA',
      featureKey: 'gestion-administrativa.config.correos',
      seccion: 'correos',
    },
  },
];
