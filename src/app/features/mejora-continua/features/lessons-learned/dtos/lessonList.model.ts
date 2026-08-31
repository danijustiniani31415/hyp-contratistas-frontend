export interface LessonListDTO {
  lessonId: number;
  lessonCode?: string;
  period: string;
  problemDescription?: string;
  reasonDescription?: string;
  lessonDescription?: string;
  impactDescription?: string;

  projectId?: number;
  projectDescription?: string;

  areaId: number;
  /** Path completo (incluye Gerencia). Para la vista de detalle. */
  areaDescription: string;
  /** Path "corto" para tabla/tarjetas: sin Gerencia, en MAYÚSCULAS. */
  areaListDescription?: string;

  /** ID del nodo hoja en el árbol de scope (catalog_item) — clasificación de la lección. */
  catalogItemId?: number;
  /** Segmentos de clasificación caminando scope_item (raíz → hoja). */
  classificationSegments?: LessonClassificationSegment[];

  /** Obra / Staff / Oficina Central (workers_obra_oficina_staff). */
  obraOficinaStaffId?: number | null;
  obraOficinaStaffName?: string | null;

  stateId: number;
  stateDescription: string;
  /** PENDIENTE | APROBADA | RECHAZADA */
  approvalStatus: string;
  images: LessonImage[];

  createdDateTime: string;
  createdUserId: number;
  createdUserFullName: string;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
}

export interface LessonListPagedDTO {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: LessonListDTO[];
}

export interface LessonsPagedWithFiltersDTO {
  paged: LessonListPagedDTO;
  filters: import('./lessonFilters.model').LessonFiltersDTO;
}

interface LessonImage {
  lessonImageId: number;
  imageUrl: string;
  lessonId: number;
  imageTypeId: number;
  imageTypeDescription: string;
}

/** Un nivel de la clasificación (Fase / Etapa / Nivel / …) con su descripción. */
export interface LessonClassificationSegment {
  catalogTypeName: string;
  catalogItemDescription: string;
}
