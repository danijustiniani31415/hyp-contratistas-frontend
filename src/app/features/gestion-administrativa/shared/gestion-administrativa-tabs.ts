import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { Roles } from '../../../core/constants/roles';

/** Pestañas del header de Gestión Administrativa — única fuente para todas sus páginas. */
export const GESTION_ADMINISTRATIVA_TABS: AbrilPageTab[] = [
  { label: 'Solicitud de Salidas',   icono: 'ti-file-text',  route: '/gestion-administrativa/solicitud-salidas',   featureKey: 'gestion-administrativa.solicitud-salidas' },
  { label: 'Gestión de Salidas',     icono: 'ti-briefcase',  route: '/gestion-administrativa/gestion-salidas',     featureKey: 'gestion-administrativa.gestion-salidas' },
  { label: 'Delegación de Revisión', icono: 'ti-user-check', route: '/gestion-administrativa/delegacion-revision', featureKey: 'gestion-administrativa.delegacion-revision' },
  // La pestaña se abre también por ROL y no solo por featureKeys: desde que existe la sección
  // "Tu firma" (que es de todo USUARIO DE ABRIL, no de una funcionalidad) la pantalla siempre tiene
  // al menos una sección que mostrar, así que dejarla solo con los featureKeys de configuración
  // habría escondido la firma de la mayoría. El acceso a cada sección sigue filtrado adentro.
  { label: 'Configuración',          icono: 'ti-settings',   route: '/gestion-administrativa/configuracion',       featureKeys: ['gestion-administrativa.config.lugares','gestion-administrativa.config.motivos','gestion-administrativa.config.trayectos','gestion-administrativa.config.visibilidad-salidas','gestion-administrativa.config.carpeta-adjuntos','gestion-administrativa.config.correos'], roles: [Roles.USUARIO_DE_ABRIL] },
];
