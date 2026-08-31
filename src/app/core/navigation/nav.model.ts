export interface NavItem {
  label: string;
  route: string;
  featureKey?: string;
  /** Basta con tener acceso a UNA de estas — para un ítem "contenedor" que agrupa varias
   * sub-páginas con distinto featureKey cada una (ver Tareo: Marcar/Gestión de permisos/
   * Revisión/Reporte comparten un solo ítem de sidebar y navegan por tabs dentro de la página). */
  featureKeys?: string[];
  roles?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface NavModule {
  key: string;
  label: string;
  iconKey: string;
  baseRoute: string;
  items: NavItem[];
  groups?: NavGroup[];
  /**
   * Comportamiento al hacer clic en el módulo desde el sidebar:
   * - 'expand'   → se autodespliega en el sitio (accordion) mostrando sus items.
   * - 'redirect' → navega directamente a una funcionalidad (por defecto).
   * Si se omite, se asume 'redirect'.
   * Nota: en desktop, un módulo 'expand' que esté con el sidebar colapsado
   * navega igualmente (no hay dónde desplegar), usando la misma resolución de ruta.
   */
  behavior?: 'expand' | 'redirect';
  /**
   * Ruta preferida al redirigir. SOLO se usa si el usuario tiene acceso a ella
   * (existe entre sus items/grupos accesibles). Si no tiene acceso, se cae
   * automáticamente al primer item accesible del módulo. Si se omite, se usa
   * directamente el primer item accesible.
   */
  landing?: string;
}
