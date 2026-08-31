export interface LessonDetailDTO {
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
  /** Path completo (incluye Gerencia). Mostrado en el modal de detalle. */
  areaDescription: string;
  /** Path "corto" sin Gerencia, en MAYÚSCULAS. Espejo del campo de la lista. */
  areaListDescription?: string;

  /** Rama seleccionada de lesson_area (modelo nuevo). Necesario para editar. */
  lessonAreaId?: number;
  /** ID del nodo hoja en el árbol de scope (catalog_item). */
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
  rejectionComment?: string;
  reviewedByFullName?: string;
  /** True si el usuario actual es el jefe del autor y la lección está PENDIENTE. */
  canReview: boolean;

  images?: LessonImageDTO[];

  createdDateTime: string;
  createdUserId: number;
  createdUserFullName: string;
  updatedDateTime?: string;
  updatedUserId?: number;
  active: boolean;
}

export interface LessonImageDTO {
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
