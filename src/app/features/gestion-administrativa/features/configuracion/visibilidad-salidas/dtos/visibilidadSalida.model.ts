export interface VisibilidadWorkerItemDTO {
  workerId: number;
  fullName?: string;
  email?: string;
  categoryId?: number;
  category?: string;
  /** Nodo area_scope al que pertenece el trabajador (para filtrar por área). null = sin área. */
  areaScopeId?: number | null;
  /** Cuántos nodos area_scope tiene asignados (override). 0 = usa el algoritmo automático. */
  areasAsignadas: number;
}

/** Carga inicial de la página: trabajadores (tabla) + árbol de áreas (filtro en cascada). */
export interface VisibilidadInicialDTO {
  workers: VisibilidadWorkerItemDTO[];
  areaTree: VisibilidadAreaNodeDTO[];
}

export interface VisibilidadAreaNodeDTO {
  areaScopeId: number;
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaTypeName: string;
  areaScopeParentId?: number | null;
  displayOrder: number;
}

export interface VisibilidadAsignacionDTO {
  areaScopeId: number;
  incluyeDescendientes: boolean;
}
