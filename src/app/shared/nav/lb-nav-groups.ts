export interface LbNavItem {
  label: string;
  route: string;
  icon: string;
}

export interface LbNavGroup {
  key: string;
  label: string;
  icon: string;
  items: LbNavItem[];
}

/**
 * Única fuente de verdad de la navegación de Las Bravas — la sidebar (categorías) y la barra de
 * tabs (sub-páginas de la categoría activa) leen de acá, nunca duplican la lista.
 */
export const LB_NAV_GROUPS: LbNavGroup[] = [
  {
    key: 'personal',
    label: 'Gestión de Personal',
    icon: 'ti-users',
    items: [
      { label: 'Personas', route: '/personas', icon: 'ti-users' },
      { label: 'Tareo', route: '/tareo', icon: 'ti-calendar-time' },
      { label: 'Planillas', route: '/planillas', icon: 'ti-cash' },
      { label: 'Datos Faltantes', route: '/dashboard-planilla', icon: 'ti-alert-circle' },
    ],
  },
  {
    key: 'logistica',
    label: 'Gestión Logística',
    icon: 'ti-truck-delivery',
    items: [
      { label: 'Pedidos', route: '/pedidos', icon: 'ti-clipboard-list' },
      { label: 'Compras', route: '/compras', icon: 'ti-shopping-cart' },
      { label: 'EPP', route: '/epp', icon: 'ti-shield-check' },
      { label: 'Herramientas', route: '/herramientas', icon: 'ti-tools' },
      { label: 'Guías de Remisión', route: '/guias-remision', icon: 'ti-truck-delivery' },
      { label: 'Almacén / Kardex', route: '/almacen', icon: 'ti-building-warehouse' },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    icon: 'ti-settings',
    items: [
      { label: 'Roles y Permisos', route: '/roles-permisos', icon: 'ti-lock' },
      { label: 'Catálogo Maestro', route: '/catalogo', icon: 'ti-list-details' },
    ],
  },
];

/** El grupo cuyo alguno de sus items coincide con la URL actual (para resaltar sidebar + tabs). */
export function findGrupoActivo(url: string): LbNavGroup | undefined {
  return LB_NAV_GROUPS.find((g) => g.items.some((i) => url === i.route || url.startsWith(i.route + '/')));
}
