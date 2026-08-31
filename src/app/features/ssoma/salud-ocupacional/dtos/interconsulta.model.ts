export type EstadoInterconsulta = 'Pendiente' | 'Atendida' | 'Cancelada' | string;

export interface InterconsultaListDto {
  id: number;
  emoId: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  proyectoId?: number;
  proyectoNombre?: string;
  contributorId?: number;
  razonSocial?: string;
  /** FK a workers_obra_oficina_staff (1=Obra, 2=Staff, 3=Oficina Central). */
  obraOficinaStaffId?: number;
  /** Nombre del catálogo (solo lectura). */
  obraOficina?: string;
  contrataCasa?: string;
  /** Nombre de la categoría del trabajador (campo de lógica), ej. "OPERARIO", "RESIDENTE". */
  categoria?: string;
  /** Nombre del puesto del trabajador (campo de presentación). */
  puesto?: string;
  workerEmail?: string;
  administradorEmail?: string;
  /** Nombre de la jefatura/área (workers.jefatura), aplica sobre todo a Staff/Oficina Central. */
  jefatura?: string;
  jefaturaEmail?: string;
  especialidad: string;
  diagnostico?: string;
  fechaDerivacion: string;
  fechaAtencion?: string;
  estado: EstadoInterconsulta;
  diasPendiente: number;
}

export interface InterconsultaDetalleDto extends InterconsultaListDto {
  motivo?: string;
  diagnostico?: string;
  cie10?: string;
  resultado?: string;
  urlInforme?: string;
  medico?: string;
  notas?: string;
}

export interface InterconsultaUpdateDto {
  fechaAtencion?: string;
  diagnostico?: string;
  cie10?: string;
  resultado?: string;
  urlInforme?: string;
  estado?: EstadoInterconsulta;
  notas?: string;
}

export interface InterconsultaResultadoPatchDto {
  estado: EstadoInterconsulta;
  fechaAtencion?: string;
  diagnostico?: string;
  cie10?: string;
  resultado?: string;
  urlInforme?: string;
  requiereSeguimiento?: boolean;
}

export interface InterconsultaDerivacionPatchDto {
  especialidad: string;
  diagnostico?: string;
}

export interface InterconsultaQueryParams {
  estado?: string;
  search?: string;
  workerId?: number;
  proyectoId?: number;
  contributorId?: number;
  /** FK a workers_obra_oficina_staff (1=Obra, 2=Staff, 3=Oficina Central). */
  obraOficinaStaffId?: number;
  page?: number;
  pageSize?: number;
}

export interface InterconsultaEnviarCorreoDto {
  ids: number[];
}

export interface InterconsultaEnviarCorreoResultDto {
  totalSeleccionadas: number;
  totalEnviados: number;
  totalErrores: number;
  detalles: string[];
}
