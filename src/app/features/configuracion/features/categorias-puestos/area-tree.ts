import { AreaNodoDto } from './dtos/categorias-puestos.dto';

/** Nodo del árbol de áreas ya jerarquizado, para el filtro en cascada. */
export interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

/** Opción del desplegable múltiple del modal: la ruta completa desambigua los nombres repetidos. */
export interface AreaFlatOption {
  areaScopeId: number;
  /** `Gerencia de Proyectos › SSOMA`. */
  ruta: string;
}

/**
 * Arma la jerarquía a partir de la lista plana que manda el backend. Mismo algoritmo que usan
 * Gestión de Salidas y Visibilidad de Salidas: se ordena primero por `displayOrder` y luego por
 * nombre, porque el árbol no trae los hijos agrupados.
 */
export function buildAreaTree(nodes: AreaNodoDto[]): AreaCascadeNode[] {
  const byId = new Map<number, AreaCascadeNode>();
  for (const n of nodes) {
    byId.set(n.areaScopeId, { areaScopeId: n.areaScopeId, name: n.areaItemName, children: [] });
  }

  const roots: AreaCascadeNode[] = [];
  const sorted = [...nodes].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.areaItemName.localeCompare(b.areaItemName),
  );
  for (const n of sorted) {
    const node = byId.get(n.areaScopeId)!;
    const parent = n.areaScopeParentId != null ? byId.get(n.areaScopeParentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/**
 * Aplana el árbol a opciones con su ruta completa. Hace falta porque el mismo nombre de área
 * existe en más de una rama (hay dos "Producción" y dos "Unidad de Proyectos"): sin la ruta el
 * desplegable mostraría dos opciones idénticas y no habría forma de saber cuál es cuál.
 */
export function flattenAreaTree(roots: AreaCascadeNode[]): AreaFlatOption[] {
  const out: AreaFlatOption[] = [];
  const walk = (nodes: AreaCascadeNode[], prefijo: string): void => {
    for (const n of nodes) {
      const ruta = prefijo ? `${prefijo} › ${n.name}` : n.name;
      out.push({ areaScopeId: n.areaScopeId, ruta });
      walk(n.children, ruta);
    }
  };
  walk(roots, '');
  return out;
}

/** El nodo y todos sus descendientes: es el alcance real de un filtro por área. */
export function collectScopeIds(node: AreaCascadeNode): number[] {
  const ids = [node.areaScopeId];
  for (const c of node.children) ids.push(...collectScopeIds(c));
  return ids;
}
