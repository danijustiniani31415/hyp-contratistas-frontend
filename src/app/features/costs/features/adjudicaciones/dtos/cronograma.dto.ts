export interface CronogramaActividadDTO {
  costosCronogramaActividadId: number;
  nombre: string;
}

/**
 * Nodo del árbol del cronograma. Se identifica por la actividad
 * (una actividad aparece a lo sumo una vez por cronograma).
 */
export interface CronogramaNodoDTO {
  actividadId: number;
  parentActividadId: number | null;
  orden: number;
  fechaInicio: string | null; // yyyy-MM-dd
  fechaFin: string | null; // yyyy-MM-dd
}

export interface CronogramaFormDataDTO {
  actividades: CronogramaActividadDTO[];
  nodos: CronogramaNodoDTO[];
}

export interface CronogramaSaveDTO {
  nodos: CronogramaNodoDTO[];
}
