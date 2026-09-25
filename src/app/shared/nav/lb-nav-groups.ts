export interface LbNavItem {
  label: string;
  route: string;
  icon: string;
  /** Códigos de permiso que habilitan este item (basta con tener uno). Sin esta lista, el item
   * es de lectura abierta a cualquier usuario autenticado (igual que su endpoint en el backend). */
  permisos?: string[];
}

export interface LbNavGroup {
  key: string;
  label: string;
  icon: string;
  items: LbNavItem[];
}

/**
 * Única fuente de verdad de la navegación de Las Bravas — la sidebar (categorías) y la barra de
 * tabs (sub-páginas de la categoría activa) leen de acá, nunca duplican la lista. `permisos` en
 * cada item debe reflejar exactamente lo que exige su ruta (lbPermisoGuard) y su controller en el
 * backend — si no, un usuario ve un link que igual lo rebota, o al revés, no ve algo a lo que sí
 * podía entrar. [DECIDIDO 2026-09-25] tras un caso real: el admin veía "Configuración" en el menú
 * pero no podía entrar porque su rol no tenía el permiso — confuso. Ahora el link ni aparece.
 */
export const LB_NAV_GROUPS: LbNavGroup[] = [
  {
    key: 'personal',
    label: 'Gestión de Personal',
    icon: 'ti-users',
    items: [
      { label: 'Personas', route: '/personas', icon: 'ti-users' },
      { label: 'Tareo', route: '/tareo', icon: 'ti-calendar-time' },
      { label: 'Planillas', route: '/planillas', icon: 'ti-cash', permisos: ['PLANILLA_CALCULAR', 'PLANILLA_CONFIGURAR'] },
      { label: 'Datos Faltantes', route: '/dashboard-planilla', icon: 'ti-alert-circle' },
    ],
  },
  {
    key: 'logistica',
    label: 'Gestión Logística',
    icon: 'ti-truck-delivery',
    items: [
      { label: 'Pedidos', route: '/pedidos', icon: 'ti-clipboard-list', permisos: ['PEDIDO_CREAR', 'PEDIDO_APROBAR', 'PEDIDO_ENTREGAR', 'PEDIDO_VER_TODOS', 'PEDIDO_VISAR'] },
      { label: 'Compras', route: '/compras', icon: 'ti-shopping-cart', permisos: ['COMPRA_CREAR', 'COMPRA_RECIBIR'] },
      { label: 'EPP', route: '/epp', icon: 'ti-shield-check', permisos: ['EPP_ENTREGAR'] },
      { label: 'Herramientas', route: '/herramientas', icon: 'ti-tools', permisos: ['HERRAMIENTA_PRESTAR', 'HERRAMIENTA_DEVOLVER'] },
      { label: 'Guías de Remisión', route: '/guias-remision', icon: 'ti-truck-delivery', permisos: ['GUIA_REMISION_VER', 'GUIA_REMISION_CREAR', 'GUIA_REMISION_ENVIAR', 'GUIA_REMISION_CONFIRMAR'] },
      { label: 'Almacén / Kardex', route: '/almacen', icon: 'ti-building-warehouse' },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    icon: 'ti-settings',
    items: [
      { label: 'Roles y Permisos', route: '/roles-permisos', icon: 'ti-lock', permisos: ['ROLES_GESTIONAR'] },
      { label: 'Catálogo Maestro', route: '/catalogo', icon: 'ti-list-details' },
    ],
  },
];

/** true si el usuario puede ver este item — sin `permisos` es lectura abierta a cualquier logueado. */
export function itemVisible(item: LbNavItem, hasPermiso: (codigo: string) => boolean): boolean {
  return !item.permisos?.length || item.permisos.some(hasPermiso);
}

/** Items visibles de un grupo para el usuario actual. */
export function itemsVisibles(grupo: LbNavGroup, hasPermiso: (codigo: string) => boolean): LbNavItem[] {
  return grupo.items.filter((i) => itemVisible(i, hasPermiso));
}

/** El grupo cuyo alguno de sus items coincide con la URL actual (para resaltar sidebar + tabs). */
export function findGrupoActivo(url: string): LbNavGroup | undefined {
  return LB_NAV_GROUPS.find((g) => g.items.some((i) => url === i.route || url.startsWith(i.route + '/')));
}
