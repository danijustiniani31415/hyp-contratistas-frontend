/** Un revisor asignado a un área (fila viva de area_revisores). */
export interface AreaRevisorAsignadoDTO {
  /** area_revisores_id */
  id: number;
  revisorWorkerId: number;
  revisorFullName?: string;
  revisorEmail?: string;
  revisorCategory?: string;
  /** 1 = primero en ser considerado; a mayor número, menor prioridad. */
  ordenPrioridad: number;
  /** false = no se considera (ej. ausencia temporal del revisor). */
  active: boolean;
}

/** Revisores de un proyecto dentro de un área "filtrada por proyecto". */
export interface AreaProyectoRevisoresDTO {
  projectId: number;
  projectName: string;
  revisores: AreaRevisorAsignadoDTO[];
}

/**
 * Una fila por área de tipo "Área de Gerencia" o "Área Estándar" que sea el primer
 * nodo de su mismo tipo en su rama del árbol de áreas, junto a sus n revisores
 * ordenados por prioridad. Estos revisores aplican a los trabajadores del área que
 * no tienen revisores propios en Revisores de Trabajadores.
 */
export interface AreaRevisorItemDTO {
  areaScopeId: number;
  areaName: string;
  /** Tipo del nodo: "Área de Gerencia" o "Área Estándar". */
  areaTypeName: string;
  /** Nombre del área padre (normalmente la gerencia). null = nodo raíz. */
  parentName?: string | null;
  /** Revisores a nivel de área (project_id NULL). */
  revisores: AreaRevisorAsignadoDTO[];
  /** true = el área se subdivide por proyecto (se muestran subfilas por proyecto). */
  filtraPorProyecto: boolean;
  /** Proyectos del área que ya tienen revisores asignados (solo si filtraPorProyecto). */
  proyectos: AreaProyectoRevisoresDTO[];
}

export interface AreaRevisorOptionDTO {
  workerId: number;
  fullName?: string;
  email?: string;
}

/** Opción/subfila de proyecto. */
export interface ProyectoOptionDTO {
  projectId: number;
  projectName: string;
}

/** Carga inicial de la página: áreas configurables con sus revisores + opciones del selector. */
export interface AreaRevisorInicialDTO {
  areas: AreaRevisorItemDTO[];
  options: AreaRevisorOptionDTO[];
  /** Todos los proyectos activos, para armar las subfilas y el selector de proyecto. */
  proyectos: ProyectoOptionDTO[];
}

/** Una asignación de revisor dentro del PUT. */
export interface AreaRevisorAsignacionDTO {
  revisorWorkerId: number;
  ordenPrioridad: number;
  active: boolean;
}

/**
 * Cuerpo del PUT: reemplaza el conjunto completo de revisores del área (projectId null)
 * o del proyecto dentro del área (projectId con valor).
 */
export interface AreaRevisoresUpdateDTO {
  /** null = revisores a nivel de área; con valor = revisores del proyecto dentro del área. */
  projectId?: number | null;
  revisores: AreaRevisorAsignacionDTO[];
}

/** Cuerpo del PUT de flag "filtrar por proyecto". */
export interface AreaFiltroProyectoUpdateDTO {
  filtraPorProyecto: boolean;
}
