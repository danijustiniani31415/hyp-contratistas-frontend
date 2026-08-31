export interface AreaScopeTreeDto {
  areaScopeId: number;
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaTypeName: string;
  areaScopeParentId: number | null;
  displayOrder: number;
  active: boolean;
  /** Trabajadores activos asignados directamente a este nodo (workers.area_scope_id). */
  workersCount: number;
  children: AreaScopeTreeDto[];
}

export interface AreaScopeWorkerDto {
  workerId: number;
  fullName: string | null;
  emailCorporativo: string | null;
  /** Nombre de la categoría (workers.worker_category_id → workers_category.name). */
  categoryName: string | null;
}

/** Reasignación del padre de un nodo. null = mover a la raíz. */
export interface AreaScopeUpdateParentDto {
  newParentAreaScopeId: number | null;
}

export interface AreaScopeBranchNodeDto {
  tempId: number;
  areaItemId: number;
  parentTempId: number | null;
  displayOrder: number;
}

export interface AreaScopeBranchDto {
  nodes: AreaScopeBranchNodeDto[];
}
