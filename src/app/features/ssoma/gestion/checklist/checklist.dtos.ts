// ─── Plantillas (catálogo maestro) ──────────────────────────────────────────

export interface ChecklistPlantillaListDto {
  id: number;
  nombre: string;
  descripcion?: string;
  tipoActivacion: string; // 'automatico' | 'manual'
  eventoActivacion?: string;
  esObligatorio: boolean;
  orden: number;
  activo: boolean;
  totalItems: number;
}

export interface ChecklistPlantillaItemDto {
  id: number;
  descripcion: string;
  orden: number;
  tieneAdjuntoRef: boolean;
  activo: boolean;
}

export interface ChecklistPlantillaItemCreateDto {
  descripcion: string;
  tieneAdjuntoRef: boolean;
}

export interface ChecklistPlantillaItemEditDto {
  descripcion: string;
  tieneAdjuntoRef: boolean;
  activo: boolean;
}

export interface ChecklistPlantillaDetalleDto extends ChecklistPlantillaListDto {
  items: ChecklistPlantillaItemDto[];
}

// ─── Checklists de Proyecto ──────────────────────────────────────────────────

export interface ChecklistProyectoCardDto {
  checklistProyectoId: number;
  plantillaId: number;
  nombrePlantilla: string;
  esObligatorio: boolean;
  estado: 'pendiente' | 'en_progreso' | 'completado';
  porcentajeCompletado: number;
  totalItems: number;
  itemsCompletados: number;
  fechaActivacion: string;
  fechaCompletado?: string;
  activadoPor?: string;
}

export interface ChecklistProyectoResumenDto {
  proyectoId: number;
  checklists: ChecklistProyectoCardDto[];
}

export interface ChecklistProyectoItemDto {
  id: number;
  plantillaItemId: number;
  descripcion: string;
  orden: number;
  tieneAdjuntoRef: boolean;
  completado: boolean;
  fechaCompletado?: string;
  completadoPor?: string;
  observacion?: string;
  urlAdjunto?: string;
}

export interface ChecklistProyectoDetalleDto {
  id: number;
  proyectoId: number;
  proyectoNombre: string;
  plantillaId: number;
  nombrePlantilla: string;
  esObligatorio: boolean;
  estado: string;
  porcentajeCompletado: number;
  fechaActivacion: string;
  fechaCompletado?: string;
  items: ChecklistProyectoItemDto[];
}

export interface ChecklistItemToggleDto {
  completado: boolean;
  observacion?: string;
  urlAdjunto?: string;
}

export interface ChecklistActivarDto {
  plantillaId: number;
}
