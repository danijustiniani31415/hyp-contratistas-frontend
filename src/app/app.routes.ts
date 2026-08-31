import { Routes } from '@angular/router';
import { Dashboard } from './features/home/dashboard/dashboard';
import { Boletin } from './features/home/boletin/boletin';
import { Layout } from './shared/components/layout/layout';
import { authGuard } from './core/guards/auth.guard';
import { boletinGuard } from './core/guards/boletin.guard';
import { rootRedirect } from './core/guards/root-redirect';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth-module')
      .then(m => m.AuthModule)
  },

  {
    path: 'boletin',
    component: Boletin,
    canActivate: [boletinGuard],
  },

  { path: '', pathMatch: 'full', redirectTo: rootRedirect },

  {
    path: '',
    component: Layout,
    canActivateChild: [authGuard],
    children: [
      { path: 'inicio', component: Dashboard },

      {
        path: 'centro-aprendizaje',
        loadComponent: () =>
          import('./features/home/centro-aprendizaje/centro-aprendizaje')
          .then(m => m.CentroAprendizaje)
      },

      {
        path: 'security',
        loadChildren: () =>
          import('./features/security/seguridad-module')
          .then(m => m.SeguridadModule)
      },

      {
        path: 'projects',
        loadChildren: () =>
          import('./features/projects/proyectos.routes')
          .then(m => m.PROJECTS_ROUTES)
      },

      {
        path: 'costs',
        loadChildren: () =>
          import('./features/costs/costs-module')
          .then(m => m.CostsModule)
      },

      {
        path: 'configuracion',
        loadChildren: () =>
          import('./features/configuracion/configuracion-module')
          .then(m => m.ConfiguracionModule)
      },

      {
        path: 'contractors',
        loadChildren: () =>
          import('./features/contractors/contractors.routes')
          .then(m => m.CONTRACTORS_ADMIN_ROUTES)
      },

      {
        path: 'arquitectura-comercial',
        loadChildren: () =>
          import('./features/arquitectura-comercial/arquitectura-comercial-module')
          .then(m => m.ArquitecturaComercialModule)
      },

      {
        path: 'ssoma',
        loadChildren: () =>
          import('./features/ssoma/ssoma.routes')
          .then(m => m.SSOMA_ROUTES)
      },

      {
        path: 'habilitacion',
        loadChildren: () =>
          import('./features/habilitacion/habilitacion.routes')
          .then(m => m.HABILITACION_ROUTES)
      },

      {
        path: 'clinica',
        loadChildren: () =>
          import('./features/clinica/clinica.routes')
          .then(m => m.CLINICA_ROUTES)
      },

      {
        path: 'gestion-administrativa',
        loadChildren: () =>
          import('./features/gestion-administrativa/gestion-administrativa.routes')
          .then(m => m.GESTION_ADMINISTRATIVA_ROUTES)
      },

      {
        path: 'gestion-gth',
        loadChildren: () =>
          import('./features/gestion-gth/gestion-gth.routes')
          .then(m => m.GESTION_GTH_ROUTES)
      },

      {
        path: 'mejora-continua',
        loadChildren: () =>
          import('./features/mejora-continua/mejora-continua.routes')
          .then(m => m.MEJORA_CONTINUA_ROUTES)
      },

      {
        path: 'evaluaciones',
        loadChildren: () =>
          import('./features/evaluaciones/evaluaciones.routes')
          .then(m => m.EVALUACIONES_ROUTES)
      },

      {
        path: 'vecinos',
        loadChildren: () =>
          import('./features/vecinos/vecinos.routes')
          .then(m => m.VECINOS_ROUTES)
      },

      {
        path: 'contabilidad',
        loadChildren: () =>
          import('./features/contabilidad/contabilidad.routes')
          .then(m => m.CONTABILIDAD_ROUTES)
      }
    ]
  },

  {
    path: 'contractors',
    loadChildren: () =>
      import('./features/contractors/contractors.routes')
      .then(m => m.CONTRACTORS_ROUTES)
  },

  {
    path: 'habilitacion/registro-empresa',
    loadComponent: () =>
      import('./features/habilitacion/pages/registro-empresa/registro-empresa')
      .then(m => m.RegistroEmpresa)
  },

  {
    path: 'auth/activar-contratista',
    loadComponent: () =>
      import('./features/auth/pages/activar-contratista/activar-contratista')
      .then(m => m.ActivarContratista)
  },

  {
    path: 'auth/recuperar-contratista',
    loadComponent: () =>
      import('./features/auth/pages/recuperar-contratista/recuperar-contratista')
      .then(m => m.RecuperarContratista)
  },

  {
    path: 'auth/contractor-credentials',
    loadComponent: () =>
      import('./features/auth/pages/contractor-credentials/components/contractor-credentials')
      .then(m => m.ContractorCredentials)
  },

  {
    path: 'auth/activar-empresa',
    loadComponent: () =>
      import('./features/auth/pages/activar-empresa/activar-empresa.component')
      .then(m => m.ActivarEmpresaComponent)
  },

  {
    path: 'clinica/activar',
    loadComponent: () =>
      import('./features/clinica/pages/activar/activar')
      .then(m => m.ActivarClinica)
  },

  {
    path: 'portal-trabajador',
    loadComponent: () =>
      import('./features/portal-trabajador/portal-trabajador')
      .then(m => m.PortalTrabajador)
  },

  {
    // Formulario público del postulante (acceso por token enviado al correo, sin login).
    path: 'postulante/formulario',
    loadComponent: () =>
      import('./features/gestion-gth/postulante-formulario/postulante-formulario')
      .then(m => m.PostulanteFormulario)
  },

  {
    // Respuesta del candidato a su entrevista (acceso por token, sin login): a esta página llegan
    // los botones «Confirmar» y «Rechazar» del correo de invitación.
    path: 'postulante/entrevista',
    loadComponent: () =>
      import('./features/gestion-gth/postulante-entrevista/postulante-entrevista')
      .then(m => m.PostulanteEntrevista)
  },

  {
    // Carta oferta del postulante (acceso por token enviado al correo, sin login): la lee, registra
    // su firma y la firma en línea. Reemplaza al envío de la carta adjunta por correo.
    path: 'postulante/carta-oferta',
    loadComponent: () =>
      import('./features/gestion-gth/carta-oferta-firma/carta-oferta-firma')
      .then(m => m.CartaOfertaFirma)
  },

  {
    path: 'registros-modelo',
    loadComponent: () =>
      import('./features/habilitacion/pages/registros-modelo/registros-modelo')
      .then(m => m.RegistrosModelo),
    data: { publicMode: true }
  },

  {
    path: 'paleta-demo',
    loadComponent: () =>
      import('./features/paleta-demo/paleta-demo')
      .then(m => m.PaletaDemoComponent)
  },

  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
