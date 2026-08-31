import { AreaArbolNodoDto } from '../../features/habilitacion/dtos/catalogos.model';

/**
 * Filtro "Área" en cascada: primero se elige la Gerencia (nodo raíz del árbol area_scope, sin
 * padre — "Gerencia de Administración", "Gerencia de Proyectos", "Gerencia de Marketing"),
 * después el área hija de esa gerencia. Igual que el desplegable en cascada del formulario de
 * editar trabajador, para no introducir una UX distinta en los filtros.
 *
 * Elegir solo la gerencia (sin área) filtra a TODOS sus trabajadores, no solo a los que están
 * directamente en el nodo gerencia — el backend resuelve el subárbol completo a partir del id
 * que se le mande, sea de gerencia o de área.
 */

/** Nodos raíz del árbol (las gerencias), ordenados alfabéticamente. */
export function getGerencias(nodos: AreaArbolNodoDto[]): AreaArbolNodoDto[] {
  return nodos
    .filter((n) => n.areaScopeParentId == null)
    .slice()
    .sort((a, b) => a.areaItemName.localeCompare(b.areaItemName, 'es'));
}

/** Hijos directos de un nodo (p.ej. las áreas de una gerencia), ordenados alfabéticamente. */
export function getHijos(nodos: AreaArbolNodoDto[], padreId: number): AreaArbolNodoDto[] {
  return nodos
    .filter((n) => n.areaScopeParentId === padreId)
    .slice()
    .sort((a, b) => a.areaItemName.localeCompare(b.areaItemName, 'es'));
}
