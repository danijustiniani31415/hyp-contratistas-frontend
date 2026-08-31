export type EstadoProgramacion =
  | 'Programada'
  | 'Confirmada'
  | 'Completada'
  | 'No se presentó'
  | 'Cancelada'
  | 'Programado'
  | 'Confirmado'
  | 'Realizado'
  | 'Cancelado'
  | 'Reprogramado'
  | 'Aceptado por Clínica'
  | 'Rechazado por Clínica'
  | 'En Atención'
  | 'Completado'
  | string;

export interface ProgramacionListDto {
  id: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  tipoEmo: string;
  tipoEmoId?: number;
  empresa: string;
  proyecto?: string | null;
  fechaProgramada: string;
  horaProgramada?: string | null;
  clinica?: string;
  medico?: string;
  estado: EstadoProgramacion;
  motivo?: string;
  notas?: string;
  origen?: string;
  checkInHora?: string;
  motivoRechazo?: string;
  emoResultadoId?: number;
  fechaNotificacion?: string;
  fechaVencimientoEmo?: string | null;
  /** Nombre del puesto del trabajador (campo de presentación). */
  puesto?: string | null;
  /** Nombre de la categoría del trabajador (campo de lógica). */
  categoria?: string | null;
  tipoTrabajador?: string | null;
  interconsultaEstado?: string | null;
  tieneInterconsulta?: boolean;
}

export interface ProgramacionCreateDto {
  workerId: number;
  tipoEmoId: number;
  empresaId: number;
  fechaProgramada: string;
  hora?: string;
  clinicaId?: number;
  medicoId?: number;
  motivo?: string;
  notas?: string;
}

export interface ProgramacionUpdateDto extends Partial<ProgramacionCreateDto> {}

export interface ProgramacionEstadoPatchDto {
  estado: EstadoProgramacion;
  motivo?: string;
}

export interface ProgramacionQueryParams {
  clinicaId?: number;
  areaScopeId?: number;
  desde?: string;
  hasta?: string;
  estado?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ProgramacionResumenDto {
  programados: number;
  aceptados: number;
  enAtencion: number;
  completados: number;
  rechazados: number;
  noPresento: number;
  automaticos: number;
  total: number;
}
