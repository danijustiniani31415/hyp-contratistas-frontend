export interface RestriccionDto {
  id: number;
  projectId: number;
  descripcion: string;
  estado: string; // "ABIERTO" | "EN_GESTION" | "CERRADO"
  fechaCreacion: string; // ISO 8601 con offset
  fechaActualizacion: string | null;
  fechaCierre: string | null;
  /** Fecha estimada de levantamiento, distinta de fechaCierre (que es la fecha de cierre real). */
  fechaLevantamientoPrevista: string | null;
  /** Ubicación exacta que afecta la restricción — todos opcionales. */
  zonaId: number | null;
  zonaNombre: string | null;
  nivelId: number | null;
  nivelNombre: string | null;
  sectorId: number | null;
  sectorNombre: string | null;
  actividadId: number | null;
  actividadNombre: string | null;
}

export interface RestriccionCreateDto {
  descripcion: string;
  estado: string; // "ABIERTO" | "EN_GESTION"
  fechaLevantamientoPrevista: string | null;
  zonaId: number | null;
  nivelId: number | null;
  sectorId: number | null;
  actividadId: number | null;
}

export interface RestriccionUpdateDto {
  descripcion: string;
  estado: string; // "ABIERTO" | "EN_GESTION"
  fechaLevantamientoPrevista: string | null;
  zonaId: number | null;
  nivelId: number | null;
  sectorId: number | null;
  actividadId: number | null;
}
