import { AreaSimpleDTO } from '../../../../../core/dtos/area/areaSimple.model';
import { ProjectSimpleDTO } from '../../../../../core/dtos/project/projectSimple.model';
import { LessonPeriodDTO } from './lessonPeriod.model';
import { UserSimpleDTO } from '../../../../../core/dtos/user/userSimple.model';

export interface LessonFiltersDTO {
  projects: ProjectSimpleDTO[];
  areas: AreaSimpleDTO[];
  periods: LessonPeriodDTO[];
  users: UserSimpleDTO[];
  /** Revisores asignados (worker_lesson_jefe_id) a los autores de las lecciones. */
  reviewers: LessonReviewerDTO[];
  /**
   * Filtros dinámicos por catalog_type — uno por cada tipo (Fase / Etapa / Nivel / …)
   * que tenga al menos un catalog_item activo en scope_item.
   */
  categories: CatalogFilterGroupDTO[];
  /**
   * Catálogo Obra / Staff / Oficina Central (workers_obra_oficina_staff). Sustituye
   * al antiguo nivel "subárea" de la cascada de áreas, que salía de los nodos de
   * tipo "Área Obra_Oficina" (ya eliminados).
   */
  obraOficinaStaff: ObraOficinaStaffOptionDTO[];
  /** Valor sugerido en el formulario: el del trabajador que registra. */
  defaultObraOficinaStaffId?: number | null;
  /**
   * Área sugerida en el formulario, resuelta en el backend desde el nodo del árbol
   * asignado al trabajador (workers.area_scope_id). Con esto la cascada de área llega
   * preseleccionada y al usuario solo le queda elegir el proyecto.
   */
  defaultLessonAreaId?: number | null;
}

/** Opción del catálogo workers_obra_oficina_staff. */
export interface ObraOficinaStaffOptionDTO {
  obraOficinaStaffId: number;
  name: string;
}

/** Opción del filtro "Revisor": workerId del revisor y su nombre. */
export interface LessonReviewerDTO {
  workerId: number;
  fullName: string;
}

export interface CatalogFilterGroupDTO {
  catalogTypeId: number;
  catalogTypeName: string;
  items: CatalogFilterItemDTO[];
}

export interface CatalogFilterItemDTO {
  catalogItemId: number;
  catalogItemDescription: string;
}
