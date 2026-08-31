import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Seguridad — única fuente para todas sus páginas. */
export const SECURITY_TABS: AbrilPageTab[] = [
  { label: 'Usuarios', icono: 'ti-users',  route: '/security/users', featureKey: 'security.users' },
  { label: 'Roles',    icono: 'ti-shield', route: '/security/roles', featureKey: 'security.roles' },
];
