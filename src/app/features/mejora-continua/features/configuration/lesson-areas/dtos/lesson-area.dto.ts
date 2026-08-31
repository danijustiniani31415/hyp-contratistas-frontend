export interface LessonAreaSegmentDto {
  areaItemName: string;
  areaTypeName: string;
}

export interface LessonAreaConfigItemDto {
  lessonAreaId: number | null;
  areaScopeId: number;
  path: LessonAreaSegmentDto[];
  active: boolean;
  /** Aparece en el formulario de creación (requiere active + plantilla). */
  includeInForm: boolean;
  /** En filtros del dashboard, agrupa a sus descendientes (requiere active + hijos). */
  includeDescendants: boolean;
  /** Se muestra como opción independiente en el formulario (requiere active + includeInForm). */
  includeAsIndependent: boolean;
  /** El nodo tiene plantilla (scope_item). */
  hasScope: boolean;
  /** El nodo tiene hijos en el árbol. */
  hasChildren: boolean;
}

export interface ToggleLessonAreaResultDto {
  lessonAreaId: number;
  active: boolean;
}

export interface SetLessonAreaFlagResultDto {
  lessonAreaId: number;
  value: boolean;
}
