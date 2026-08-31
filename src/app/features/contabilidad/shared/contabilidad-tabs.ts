import { AbrilPageTab } from '../../../shared/components/abril-page-header/abril-page-header.component';

/** Pestañas del header de Contabilidad — única fuente para todas sus páginas. */
export const CONTABILIDAD_TABS: AbrilPageTab[] = [
  { label: 'Dashboard',     icono: 'ti-layout-dashboard', route: '/contabilidad/dashboard',     featureKey: 'accounting.dashboard' },
  { label: 'Facturas',      icono: 'ti-file-invoice',     route: '/contabilidad/facturas',      featureKey: 'accounting.invoices' },
  { label: 'Configuración', icono: 'ti-settings',         route: '/contabilidad/configuracion', featureKey: 'accounting.configuration' },
];
