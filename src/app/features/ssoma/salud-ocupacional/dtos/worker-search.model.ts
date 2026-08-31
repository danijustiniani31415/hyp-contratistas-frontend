export interface WorkerSearchItemDto {
  id: number;
  apellidoNombre: string;
  dni: string;
  emailCorporativo?: string;
  cargo?: string;
  categoria?: string;
  /** Nombre del puesto (campo de presentación). */
  puesto?: string;
  /** FK a workers_obra_oficina_staff — clasificación de riesgo actual del trabajador,
   * gestionada desde Habilitación (Cambiar obra / puesto de trabajo). */
  obraOficinaStaffId?: number | null;
  obraOficinaStaffNombre?: string | null;
  empresaActual?: string;
  empresaActualId?: number;
  activo: boolean;
  aniosExperiencia?: number;
  fechaIngreso?: string;
  inhabilitadoSsoma?: boolean;
  esAbril?: boolean;
}
