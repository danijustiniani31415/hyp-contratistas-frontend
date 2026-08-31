import { Injectable } from '@angular/core';
import { NavModule, NavItem, NavGroup } from './nav.model';
import { AuthService } from '../services/auth.service';
import { Roles } from '../constants/roles';

@Injectable({ providedIn: 'root' })
export class NavigationService {

  private readonly config: NavModule[] = [
    {
      key: 'gestion-administrativa',
      label: 'Gestión Administrativa',
      iconKey: 'briefcase',
      baseRoute: '/gestion-administrativa',
      behavior: 'expand',
      landing: '/gestion-administrativa/solicitud-salidas',
      items: [
        { label: 'Solicitud de Salidas', route: '/gestion-administrativa/solicitud-salidas', featureKey: 'gestion-administrativa.solicitud-salidas' },
        { label: 'Gestión de Salidas',   route: '/gestion-administrativa/gestion-salidas',   featureKey: 'gestion-administrativa.gestion-salidas' },
        { label: 'Delegación de Revisión', route: '/gestion-administrativa/delegacion-revision', featureKey: 'gestion-administrativa.delegacion-revision' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Lugares',   route: '/gestion-administrativa/configuracion/lugares',   featureKey: 'gestion-administrativa.config.lugares' },
            { label: 'Motivos',   route: '/gestion-administrativa/configuracion/motivos',   featureKey: 'gestion-administrativa.config.motivos' },
            { label: 'Trayectos', route: '/gestion-administrativa/configuracion/trayectos', featureKey: 'gestion-administrativa.config.trayectos' },
            { label: 'Visibilidad de Salidas', route: '/gestion-administrativa/configuracion/visibilidad-salidas', featureKey: 'gestion-administrativa.config.visibilidad-salidas' },
            { label: 'Carpeta Adjuntos', route: '/gestion-administrativa/configuracion/carpeta-adjuntos', featureKey: 'gestion-administrativa.config.carpeta-adjuntos' },
            { label: 'Correos', route: '/gestion-administrativa/configuracion/correos', featureKey: 'gestion-administrativa.config.correos' },
            // Por rol y no por featureKey: la firma es de la persona, no de una funcionalidad.
            // Mismo criterio que el roleGuard de su ruta (ver gestion-administrativa.routes.ts).
            { label: 'Tu firma', route: '/gestion-administrativa/configuracion/firma', roles: [Roles.USUARIO_DE_ABRIL] },
          ],
        },
      ],
    },
    {
      key: 'mejora-continua',
      label: 'Mejora Continua',
      iconKey: 'trending-up',
      baseRoute: '/mejora-continua',
      behavior: 'expand',
      landing: '/mejora-continua/dashboard',
      items: [
        { label: 'Cronograma de Hitos',  route: '/mejora-continua/milestone-schedule', featureKey: 'mejora-continua.milestone-schedule' },
        { label: 'Dashboard',            route: '/mejora-continua/dashboard',        featureKey: 'mejora-continua.dashboard' },
        { label: 'Lecciones aprendidas', route: '/mejora-continua/lessons-learned',  featureKey: 'mejora-continua.lessons-learned' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Configuración de lecciones', route: '/mejora-continua/lecciones-configuracion',     featureKey: 'mejora-continua.config.lecciones-configuracion' },
            { label: 'Áreas',                       route: '/mejora-continua/configuration/areas',          featureKey: 'mejora-continua.config.areas' },
            { label: 'Relaciones por área',         route: '/mejora-continua/configuration/area-relations', featureKey: 'mejora-continua.config.area-relations' },
            { label: 'Plantillas',                  route: '/mejora-continua/configuration/templates',      featureKey: 'mejora-continua.config.templates' },
            { label: 'Tipos de catálogo',           route: '/mejora-continua/configuration/catalog-types',  featureKey: 'mejora-continua.config.catalog-types' },
            { label: 'Ítems de catálogo',           route: '/mejora-continua/configuration/catalog-items',  featureKey: 'mejora-continua.config.catalog-items' },
            { label: 'Recordatorios',               route: '/mejora-continua/configuration/reminders',      featureKey: 'mejora-continua.config.reminders' },
          ],
        },
      ],
    },
    {
      key: 'proyectos',
      label: 'Proyectos',
      iconKey: 'building-estate',
      baseRoute: '/projects',
      behavior: 'expand',
      landing: '/projects/projects-dashboard',
      items: [
        { label: 'Dashboard de Proyectos',                  route: '/projects/projects-dashboard',           featureKey: 'projects.projects-dashboard' },
        { label: 'Cronograma de Actividades',               route: '/projects/cronograma-actividades',       featureKey: 'projects.cronograma-actividades' },
        { label: 'Dashboard UDP',                           route: '/projects/cronograma-dashboard',         featureKey: 'projects.cronograma-dashboard' },
        // 'Dashboard Lecciones' movido a Mejora Continua (/mejora-continua/dashboard)
        // 'Actas de Reunión' ya NO pertenece a Proyectos: es su propio módulo independiente en el sidebar (key 'actas-reunion').
        { label: 'Control de IVTs',                         route: '/projects/technical-inspection-visit',   featureKey: 'projects.ivt-control' },
        { label: 'Control de cuaderno de obra',             route: '/projects/construction-logbook',         featureKey: 'projects.construction-logbook' },
        { label: 'Control de respuesta de informes',        route: '/projects/report-response-control',      featureKey: 'projects.report-response-control' },
        { label: 'Seguimiento y medición de residentes',    route: '/projects/resident-monitoring-measurement', featureKey: 'projects.resident-monitoring-measurement' },
        {
          label: 'Planeamiento',
          route: '/projects/planeamiento-bim/configuracion-inicial',
          featureKey: 'planeamiento-bim.configuracion-inicial',
          featureKeys: ['planeamiento-bim.configuracion-inicial', 'planeamiento-bim.portafolio'],
        },
      ],
      groups: [],
    },
    {
      key: 'actas-reunion',
      label: 'Actas de Reunión',
      iconKey: 'file-description',
      baseRoute: '/projects/actas-reunion',
      items: [
        { label: 'Actas de Reunión', route: '/projects/actas-reunion', featureKey: 'projects.actas-reunion' },
      ],
      groups: [],
    },
    {
      key: 'contratistas',
      label: 'Contratistas',
      iconKey: 'file-certificate',
      baseRoute: '/contractors',
      behavior: 'expand',
      landing: '/contractors/management',
      items: [
        // Apunta a la ruta INTERNA (dentro del shell, logo opcional), no a la pública
        // /contractors/registro (esa es solo para contratistas externos vía login).
        { label: 'Registro de contratistas',    route: '/contractors/registro-interno', featureKey: 'contractors.registro' },
        { label: 'Homologación de contratistas', route: '/contractors/management', featureKey: 'contractors.management' },
      ],
    },
    {
      key: 'costos',
      label: 'Costos y Presupuestos',
      iconKey: 'coins',
      baseRoute: '/costs',
      behavior: 'expand',
      landing: '/costs/adjudicaciones',
      items: [
        { label: 'Dashboard', route: '/costs/dashboard', featureKey: 'costs.dashboard' },
        { label: 'Adjudicaciones', route: '/costs/adjudicaciones', featureKey: 'costs.adjudicaciones' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Partidas',             route: '/costs/configuration/work-item',            featureKey: 'costs.config.work-item' },
            { label: 'Partidas de control',  route: '/costs/configuration/work-item-category',  featureKey: 'costs.config.work-item-category' },
            { label: 'Especialidades',       route: '/costs/configuration/work-specialty',       featureKey: 'costs.config.work-specialty' },
            { label: 'Correos por Proyecto', route: '/costs/configuration/staff-project-email', featureKey: 'costs.config.staff-project-email' },
            { label: 'Planos por proyecto',  route: '/costs/configuration/project-link',         featureKey: 'costs.config.project-link' },
            { label: 'Carpeta adjudicaciones', route: '/costs/configuration/adjudicacion-folder', featureKey: 'costs.config.adjudicacion-folder' },
            { label: 'Correos C. y Ppto.',   route: '/costs/configuration/costos-presupuestos-email', featureKey: 'costs.config.costos-presupuestos-email' },
          ],
        },
      ],
    },
    {
      key: 'arquitectura-comercial',
      label: 'Arquitectura Comercial',
      iconKey: 'building',
      baseRoute: '/arquitectura-comercial',
      behavior: 'expand',
      landing: '/arquitectura-comercial/dashboard',
      items: [
        { label: 'Gestión de Actividades',   route: '/arquitectura-comercial/dashboard', featureKey: 'arquitectura-comercial.dashboard' },
        { label: 'Gestión de Observaciones', route: '/arquitectura-comercial/observaciones/dashboard', featureKey: 'arquitectura-comercial.observaciones.dashboard' },
        { label: 'Gestión de Revisiones',    route: '/arquitectura-comercial/revisiones/dashboard', featureKey: 'arquitectura-comercial.revisiones.dashboard' },
        {
          label: 'Tareo',
          route: '/arquitectura-comercial/tareo/marcar',
          featureKeys: [
            'arquitectura-comercial.tareo.marcar',
            'arquitectura-comercial.tareo.enrolamiento',
            'arquitectura-comercial.tareo.gestion-permisos',
            'arquitectura-comercial.tareo.revision',
            'arquitectura-comercial.tareo.reporte',
          ],
        },
      ],
      groups: [],
    },
    {
      key: 'ssoma',
      label: 'Salud',
      iconKey: 'heart-rate-monitor',
      baseRoute: '/ssoma',
      landing: '/ssoma/salud-ocupacional/dashboard',
      // Módulo de navegación directa (sin `behavior: 'expand'`): sus items NO se
      // pintan en el sidebar — dentro de Salud Ocupacional la navegación la
      // resuelven las pestañas del header (SSOMA_TABS en
      // features/ssoma/salud-ocupacional/shared/salud-ocupacional-tabs.ts).
      // Aun así hay que declararlos TODOS con su featureKey, uno por pestaña,
      // igual que hace 'costos' con sus funcionalidades, porque los items son los
      // que deciden: (1) si el módulo se muestra — getModules() oculta el módulo
      // cuando ningún item es accesible — y (2) a dónde navega el clic, vía
      // resolveLanding. Declarar solo el dashboard escondía "Salud" a todo
      // usuario sin rol SSOMA, incluido el que llega desde el boletín a
      // Mi Salud (feature del rol USUARIO DE ABRIL) y sí puede entrar.
      // Mantener el MISMO orden que SSOMA_TABS: define el fallback de landing
      // (Mi Salud va al final, así un usuario con rol SSOMA cae en su pestaña de
      // trabajo y el usuario común, que solo tiene Mi Salud, cae en Mi Salud).
      items: [
        { label: 'Dashboard',          route: '/ssoma/salud-ocupacional/dashboard',          featureKey: 'ssoma.salud-ocupacional.dashboard' },
        { label: 'EMOs',               route: '/ssoma/salud-ocupacional/emos',               featureKey: 'ssoma.salud-ocupacional.emos' },
        { label: 'Programaciones',     route: '/ssoma/salud-ocupacional/programaciones',     featureKey: 'ssoma.salud-ocupacional.programaciones' },
        { label: 'Interconsultas',     route: '/ssoma/salud-ocupacional/interconsultas',     featureKey: 'ssoma.salud-ocupacional.interconsultas' },
        { label: 'Convalidaciones',    route: '/ssoma/salud-ocupacional/convalidaciones',    featureKey: 'ssoma.salud-ocupacional.convalidaciones' },
        { label: 'Tópico Médico',      route: '/ssoma/salud-ocupacional/topico',             featureKey: 'ssoma.salud-ocupacional.topico' },
        { label: 'Accidentes',         route: '/ssoma/salud-ocupacional/accidentes',         featureKey: 'ssoma.salud-ocupacional.accidentes' },
        { label: 'Descansos',          route: '/ssoma/salud-ocupacional/descansos',          featureKey: 'ssoma.salud-ocupacional.descansos' },
        { label: 'Asistente Social',   route: '/ssoma/salud-ocupacional/asistente-social',   featureKey: 'ssoma.salud-ocupacional.asistente-social' },
        { label: 'PASO',               route: '/ssoma/salud-ocupacional/paso',               featureKey: 'ssoma.salud-ocupacional.paso' },
        { label: 'Mi Salud',           route: '/ssoma/salud-ocupacional/mi-salud',           featureKey: 'ssoma.salud-ocupacional.mi-salud' },
      ],
      groups: [],
    },
    {
      key: 'gestion-ssoma',
      label: 'Gestión SSOMA',
      iconKey: 'shield',
      baseRoute: '/ssoma/gestion',
      behavior: 'expand',
      landing: '/ssoma/gestion/paso/dashboard',
      items: [
        { label: 'Prog. Anual SSOMA', route: '/ssoma/gestion/paso/dashboard', featureKey: 'ssoma.gestion.paso' },
        { label: 'Gestión RAC', route: '/ssoma/gestion/rac/dashboard', featureKey: 'ssoma.gestion.rac' },
        { label: 'Obs. Planeada (OPT)', route: '/ssoma/gestion/opt/dashboard', featureKey: 'ssoma.gestion.opt' },
        { label: 'PETS', route: '/ssoma/gestion/pets', featureKey: 'ssoma.gestion.pets' },
        { label: 'Inspecciones', route: '/ssoma/gestion/inspeccion/dashboard', featureKey: 'ssoma.gestion.inspeccion' },
        { label: 'Charlas & Capacitaciones', route: '/ssoma/gestion/charlas', featureKey: 'ssoma.gestion.charlas' },
        { label: 'Accidentes e Incidentes', route: '/ssoma/gestion/accidentes-incidentes/lista', featureKey: 'ssoma.gestion.accidentes-incidentes' },
        { label: 'Auditoría de ATS', route: '/ssoma/gestion/auditoria-ats/lista', featureKey: 'ssoma.gestion.auditoria-ats' },
        { label: 'Amonestaciones y Suspensiones', route: '/ssoma/gestion/amonestaciones', featureKey: 'ssoma.gestion.amonestaciones' },
        { label: 'Programación de Inducciones', route: '/ssoma/gestion/programacion-inducciones', featureKey: 'ssoma.gestion.programacion-inducciones' },
        { label: 'Dossier', route: '/habilitacion/gestion/dossier', featureKey: 'habilitacion.dossier' },
        { label: 'Indicadores SSOMA', route: '/ssoma/gestion/indicadores-proactivos/indicadores-ssoma', featureKey: 'ssoma.gestion.indicadores-proactivos' },
        { label: 'Checklists SSOMA', route: '/ssoma/gestion/checklist', featureKey: 'ssoma.gestion.checklist' },
        { label: 'Proyectos Habilitados SSOMA', route: '/ssoma/gestion/proyectos-habilitados', featureKey: 'ssoma.gestion.proyectos-habilitados' },
        { label: 'Presupuesto Materiales', route: '/ssoma/gestion/presupuesto-materiales', featureKey: 'ssoma.gestion.presupuesto-materiales' },
        { label: 'Horas Hombre', route: '/ssoma/gestion/horas-hombre/dashboard', featureKey: 'ssoma.gestion.horas-hombre' },
      ],
    },
    {
      key: 'gestion-gth',
      label: 'Gestión GTH',
      iconKey: 'users-group',
      baseRoute: '/gestion-gth',
      behavior: 'expand',
      landing: '/gestion-gth/reclutamiento',
      items: [
        // Vista de GTH (procesa las solicitudes de toda la organización).
        { label: 'Reclutamiento', route: '/gestion-gth/reclutamiento', featureKey: 'gestion-gth.reclutamiento' },
        // Continuación de Reclutamiento: el ingreso del colaborador seleccionado.
        { label: 'Onboarding', route: '/gestion-gth/onboarding', featureKey: 'gestion-gth.onboarding' },
        // Vista del solicitante (jefatura/gerencia que pide personal).
        { label: 'Solicitud de Personal', route: '/gestion-gth/solicitud-personal', featureKey: 'gestion-gth.solicitud-personal' },
        // Vista de Gerencia: aprueba/rechaza las solicitudes y deja el historial.
        { label: 'Aprobaciones', route: '/gestion-gth/aprobaciones', featureKey: 'gestion-gth.aprobaciones' },
        // Base maestra se agregará con su propia funcionalidad.
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            // Datos maestros del catálogo de trabajadores. Antes colgaba de Configuración
            // global; los administra GTH, así que vive acá (los archivos siguen físicamente
            // en `features/configuracion/features/categorias-puestos/` hasta refactorizarse).
            { label: 'Categorías y Puestos', route: '/gestion-gth/configuracion/categorias-puestos', featureKey: 'gestion-gth.config.categorias-puestos' },
            // Quiénes del área de GTH salen en el desplegable «Responsable del proceso» del
            // detalle de Reclutamiento. La lista sale sola del área: acá solo se activa/desactiva.
            { label: 'Reclutadores', route: '/gestion-gth/configuracion/reclutadores', featureKey: 'gestion-gth.config.reclutadores' },
          ],
        },
      ],
    },
    {
      key: 'habilitacion',
      label: 'Gestión de Ingresos',
      iconKey: 'users-group',
      baseRoute: '/habilitacion/gestion',
      items: [
        { label: 'Gestión de Ingresos', route: '/habilitacion/gestion', featureKey: 'habilitacion.trabajadores' },
      ],
      groups: [],
    },
    {
      key: 'control-acceso',
      label: 'Control de Acceso',
      iconKey: 'shield-check',
      baseRoute: '/habilitacion/control-acceso',
      items: [
        { label: 'Control de Acceso', route: '/habilitacion/control-acceso', featureKey: 'habilitacion.control-acceso' },
      ],
    },
    {
      key: 'clinica',
      label: 'Clínica',
      iconKey: 'heart-rate-monitor',
      baseRoute: '/clinica',
      items: [
        { label: 'Clínica', route: '/clinica/dashboard', featureKey: 'clinica.agenda', roles: ['CLINICA'] },
      ],
    },
    {
      key: 'evaluaciones',
      label: 'Evaluaciones',
      iconKey: 'clipboard-check',
      baseRoute: '/evaluaciones',
      behavior: 'redirect',
      landing: '/evaluaciones/dashboard',
      items: [
        { label: 'Dashboard',          route: '/evaluaciones/dashboard',     featureKey: 'evaluaciones.dashboard' },
        { label: 'Evaluar residente',  route: '/evaluaciones/evaluar',       featureKey: 'evaluaciones.evaluar' },
        { label: 'Historial',          route: '/evaluaciones/historial',      featureKey: 'evaluaciones.historial' },
        { label: 'Configuración',      route: '/evaluaciones/configuracion', featureKey: 'evaluaciones.configuracion' },
        { label: 'Asignaciones',           route: '/evaluaciones/asignaciones',          featureKey: 'evaluaciones.asignaciones' },
        { label: 'Ver eval. contratistas', route: '/evaluaciones/ver-contratistas',       featureKey: 'evaluaciones.ver-contratistas' },
        { label: 'Evaluar contratista',    route: '/evaluaciones/evaluar-contratista',    featureKey: 'evaluaciones.evaluar-contratista' },
        { label: 'Dashboard contratistas', route: '/evaluaciones/dashboard-contratistas', featureKey: 'evaluaciones.dashboard-contratistas' },
        { label: 'Evaluar supervisor SSOMA', route: '/evaluaciones/evaluar-supervisor-contratista', featureKey: 'evaluaciones.evaluar-supervisor-contratista' },
        { label: 'Ver eval. supervisores SSOMA', route: '/evaluaciones/ver-supervisores-contratista', featureKey: 'evaluaciones.ver-supervisores-contratista' },
        { label: 'Evaluar Jefe SSOMA', route: '/evaluaciones/evaluar-jefe-ssoma', featureKey: 'evaluaciones.evaluar-jefe-ssoma' },
        { label: 'Resultados Jefe SSOMA', route: '/evaluaciones/resultados-jefe-ssoma', featureKey: 'evaluaciones.resultados-jefe-ssoma' },
        { label: 'Mi perfil (Prev./Coord.)', route: '/evaluaciones/mi-perfil-prevencionista', featureKey: 'evaluaciones.mi-perfil-prevencionista' },
        { label: 'Dashboard Prev./Coord.', route: '/evaluaciones/dashboard-prevencionistas', featureKey: 'evaluaciones.dashboard-prevencionistas' },
        { label: 'Gestión SSOMA', route: '/evaluaciones/gestion-ssoma', featureKey: 'evaluaciones.gestion-ssoma' },
      ],
      groups: [],
    },
    {
      key: 'vecinos',
      label: 'Administración de Obra',
      iconKey: 'users-group',
      baseRoute: '/vecinos',
      behavior: 'expand',
      landing: '/vecinos/dashboard',
      items: [
        { label: 'Dashboard',               route: '/vecinos/dashboard',            featureKey: 'vecinos.dashboard' },
        { label: 'Gestión de Vecinos',      route: '/vecinos/gestion',              featureKey: 'vecinos.gestion' },
        { label: 'Croquis',                 route: '/vecinos/croquis',              featureKey: 'vecinos.croquis' },
        { label: 'Control de Licencias',    route: '/vecinos/control-licencias',    featureKey: 'vecinos.control-licencias' },
      ],
    },
    {
      key: 'contabilidad',
      label: 'Contabilidad',
      iconKey: 'receipt',
      baseRoute: '/contabilidad',
      behavior: 'expand',
      landing: '/contabilidad/dashboard',
      items: [
        { label: 'Dashboard', route: '/contabilidad/dashboard', featureKey: 'accounting.dashboard' },
        { label: 'Facturas', route: '/contabilidad/facturas', featureKey: 'accounting.invoices' },
      ],
      groups: [
        {
          label: 'Configuración',
          items: [
            { label: 'Configuración', route: '/contabilidad/configuracion', featureKey: 'accounting.configuration' },
          ],
        },
      ],
    },
    {
      key: 'seguridad',
      label: 'Seguridad',
      iconKey: 'shield-lock',
      baseRoute: '/security',
      behavior: 'expand',
      landing: '/security/users',
      items: [
        { label: 'Usuarios', route: '/security/users', featureKey: 'security.users' },
        { label: 'Roles',    route: '/security/roles', featureKey: 'security.roles' },
      ],
    },
    {
      key: 'configuracion',
      label: 'Configuración',
      iconKey: 'adjustments-horizontal',
      baseRoute: '/configuracion',
      items: [
        { label: 'Proyectos', route: '/configuracion/proyectos', featureKey: 'configuracion.proyectos' },
        // 'Categorías y Puestos' se movió a Gestión GTH → Configuración
        // (/gestion-gth/configuracion/categorias-puestos).
        { label: 'Revisores de Áreas', route: '/configuracion/revisores-areas', featureKey: 'configuracion.revisores-areas' },
        { label: 'Centro de aprendizaje', route: '/configuracion/aprendizaje', featureKey: 'configuracion.aprendizaje' },
      ],
    },
  ];

  constructor(private authService: AuthService) {}

  private getAllowedFeatures(): string[] {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem('allowed_features');
    return raw ? JSON.parse(raw) : [];
  }

  /** Indica si el usuario tiene acceso a la feature indicada. */
  isFeatureAllowed(featureKey: string): boolean {
    return this.getAllowedFeatures().includes(featureKey);
  }

  /**
   * Regla ÚNICA de visibilidad para cualquier entrada de navegación: items del
   * sidebar y pestañas del header por igual. Una entrada es visible si:
   *  - no declara restricción alguna (sin featureKey/featureKeys ni roles), o
   *  - el usuario tiene acceso a su `featureKey`, o
   *  - tiene acceso a AL MENOS UNO de sus `featureKeys` (pestañas "contenedor"
   *    tipo Configuración, que agrupan varias sub-secciones), o
   *  - cumple alguno de sus `roles` (incluye los centinelas CONTRATISTA/CLINICA,
   *    cuyas sesiones no viajan con allowed_features y se resuelven por tipo).
   *
   * Al declarar una entrada hay que usar la MISMA clave/roles que el roleGuard de
   * la ruta destino: así la visibilidad de la entrada coincide exactamente con la
   * accesibilidad de la ruta y nunca aparece algo que, al hacer clic, redirija al
   * inicio/boletín.
   */
  isNavEntryAllowed(entry: { featureKey?: string; featureKeys?: string[]; roles?: string[] }): boolean {
    const hasRestriction =
      !!entry.featureKey || !!entry.featureKeys?.length || !!entry.roles?.length;
    if (!hasRestriction) return true;

    const allowed = this.getAllowedFeatures();
    if (entry.featureKey && allowed.includes(entry.featureKey)) return true;
    if (entry.featureKeys?.some((k) => allowed.includes(k))) return true;

    if (entry.roles?.length) {
      // Centinelas por tipo de sesión: CONTRATISTA/CLINICA no viajan en el claim role_id
      // (usan un JWT propio), así que se resuelven por el tipo guardado en localStorage.
      if (entry.roles.includes('CONTRATISTA') && this.authService.isContratista()) return true;
      if (entry.roles.includes('CLINICA') && this.authService.isClinica()) return true;
      // Roles de staff: se comparan por ID (constantes de roles.ts) contra getRoles().
      if (entry.roles.some((r) => this.authService.hasRole(r))) return true;
    }
    return false;
  }

  private isItemAllowed(item: NavItem): boolean {
    return this.isNavEntryAllowed(item);
  }

  getModules(): NavModule[] {
    const isContratista = this.authService.isContratista();
    const modulos = this.authService.getContratistaModulos();
    return this.config
      .map((m): NavModule | null => {
        if (m.key === 'habilitacion') {
          if (isContratista && modulos === 'SSOMA') return null;
          if (isContratista) {
            return {
              ...m,
              items: [{ label: m.items[0].label, route: '/habilitacion/dashboard-contratista' }],
              groups: this.filterGroups(m.groups),
            };
          }
          return {
            ...m,
            items: this.filterItems(m.items),
            groups: this.filterGroups(m.groups),
          };
        }
        if (m.key === 'gestion-ssoma' && isContratista) {
          if (modulos === 'INGRESOS') return null;
          return {
            ...m,
            items: [
              { label: 'Gestión RAC', route: '/ssoma/gestion/rac/dashboard' },
              { label: 'Obs. Planeada (OPT)', route: '/ssoma/gestion/opt/dashboard' },
              { label: 'Inspecciones', route: '/ssoma/gestion/inspeccion/dashboard' },
              { label: 'Charlas & Capacitaciones', route: '/ssoma/gestion/charlas/contratista' },
              { label: 'Auditoría de ATS', route: '/ssoma/gestion/auditoria-ats/lista' },
              { label: 'Amonestaciones y Suspensiones', route: '/ssoma/gestion/amonestaciones' },
              { label: 'Dossier', route: '/habilitacion/gestion/dossier' },
              { label: 'Evaluar SSOMA', route: '/habilitacion/evaluar-prevencionista' },
              { label: 'Mi Desempeño', route: '/habilitacion/mi-perfil-supervisor' },
            ],
            groups: [],
          };
        }
        return {
          ...m,
          items: this.filterItems(m.items),
          groups: this.filterGroups(m.groups),
        };
      })
      .filter((m): m is NavModule => {
        if (m === null) return false;
        if (isContratista) {
          if (m.key === 'habilitacion' && modulos === 'SSOMA') return false;
          if (m.key === 'gestion-ssoma' && modulos === 'INGRESOS') return false;
        }
        // Ocultar módulos sin ninguna funcionalidad accesible: si tras filtrar
        // por allowed_features no queda ningún item ni grupo, el usuario no
        // tiene acceso a nada dentro del módulo y no debe verlo en el sidebar.
        const hasItems = m.items.length > 0;
        const hasGroupItems = (m.groups ?? []).some((g) => g.items.length > 0);
        return hasItems || hasGroupItems;
      });
  }

  /**
   * Indica si el módulo debe autodesplegarse (accordion) en vez de redirigir.
   * Controlado por `behavior: 'expand'` en la config del módulo.
   */
  isExpandable(module: NavModule): boolean {
    return module.behavior === 'expand';
  }

  /**
   * Resuelve la ruta a la que se debe navegar al hacer clic en un módulo de
   * navegación directa. Prioriza `module.landing` SOLO si el usuario tiene
   * acceso a esa ruta; en caso contrario cae al primer item/grupo accesible.
   * Devuelve null si el usuario no tiene acceso a ninguna funcionalidad del
   * módulo (caso en que el módulo ni siquiera debería mostrarse).
   *
   * El `module` recibido normalmente ya viene filtrado por `getModules()`, pero
   * se vuelve a filtrar por robustez (la operación es idempotente).
   */
  resolveLanding(module: NavModule): string | null {
    const items = this.filterItems(module.items);
    const groupItems = this.filterGroups(module.groups).flatMap((g) => g.items);
    const accessible = [...items, ...groupItems];
    if (accessible.length === 0) return null;

    if (module.landing && accessible.some((i) => i.route === module.landing)) {
      return module.landing;
    }
    return accessible[0].route;
  }

  filterItems(items: NavItem[]): NavItem[] {
    return items.filter((i) => this.isItemAllowed(i));
  }

  filterGroups(groups: NavGroup[] | undefined): NavGroup[] {
    if (!groups) return [];
    return groups
      .map((g) => ({ ...g, items: this.filterItems(g.items) }))
      .filter((g) => g.items.length > 0);
  }
}
