/**
 * De dónde sale un destinatario del correo de la cita: es el código del destinatario en
 * la Configuración de EMOs (CLINICA, JEFE, TRABAJADOR, RESIDENTE, COORD_ADMIN,
 * COORD_SSOMA, ADMIN_RAZON_SOCIAL, GTH, MEDICINA_OCUPACIONAL, ARQCOM_*, POSTVENTA_*)
 * o 'ADICIONAL' si es un correo agregado a mano.
 */
export type ProgramacionDestinatarioOrigen = string;

export interface ProgramacionDestinatarioDto {
  email: string;
  /** Nombre de la clínica, del jefe o etiqueta del destinatario. Puede venir vacío. */
  nombre?: string | null;
  origen: ProgramacionDestinatarioOrigen;
}

/** Destinatarios ya resueltos de UNO de los correos de EMO. */
export interface ProgramacionDestinatariosDto {
  para: ProgramacionDestinatarioDto[];
  copias: ProgramacionDestinatarioDto[];
  /**
   * La clínica recibe este correo, pero en el formulario todavía no se eligió cuál, así que
   * sus correos de contacto aún no están en `para`. Se nombra igual en el aviso: programar
   * exige clínica, o sea que al guardar siempre le va a llegar.
   */
  clinicaPendiente?: boolean;
  /** La clínica elegida recibe este correo pero no tiene ningún correo de contacto cargado. */
  clinicaSinCorreos?: boolean;
}

/**
 * Vista previa de a quién le llegan los correos del flujo de programación. La resuelve el
 * backend con el mismo resolver del envío real, aplicando la matriz de la Configuración de
 * EMOs al perfil del trabajador. Son dos correos distintos, en momentos distintos y con
 * destinatarios distintos, así que se muestran por separado en el modal.
 */
export interface ProgramacionDestinatariosPreviewDto {
  /** Correo que sale al guardar la cita (sección "Programación manual"). */
  manual: ProgramacionDestinatariosDto;
  /** Correo que sale después, si la clínica acepta (sección "Programación aceptada"). */
  aceptada: ProgramacionDestinatariosDto;
}

export interface CreateProgramacionDto {
  workerId: number;
  tipoEmoId: number;
  empresaId: number | null;
  fechaProgramada: string;
  horaProgramada: string | null;
  clinicaId: number | null;
  medicoId: number | null;
  notas: string | null;
  origen: string;
}

export interface ProgramacionClinicaDto {
  id: number;
  workerId: number;
  /**
   * Nombre y DNI del trabajador de la cita. Van como nullables porque el backend los sirve así
   * (`ProgramacionListDto.WorkerNombre/WorkerDni` son `string?`): declararlos no-nulos hacía que
   * el filtro del buscador llamara `.includes()` sobre un null, y esa excepción dentro del getter
   * se comía el render de toda la pantalla — por eso «buscar trabajador o DNI» no hacía nada.
   */
  workerNombre: string | null;
  workerDni: string | null;
  /** Nombre del puesto del trabajador (campo de presentación). */
  puesto?: string | null;
  tipoEmo: string;
  tipoEmoId?: number;
  empresa: string;
  empresaId?: number;
  fechaProgramada: string;
  horaProgramada: string | null;
  clinica: string | null;
  medico: string | null;
  estado: string;
  motivo: string | null;
  checkInHora: string | null;
  motivoRechazo: string | null;
  emoResultadoId: number | null;
  fechaVencimientoEmo?: string | null;
  categoria?: string | null;
  tipoTrabajador?: string | null;
  interconsultaEstado?: string;
  proyecto?: string | null;
}

export interface ClinicaInterconsultaCreateDto {
  workerId: number;
  especialidad: string;
  programacionId: number;
  centroAtencion?: string;
  diagnostico?: string;
  cie10?: string;
  medicoDerivaId?: number;
  requiereSeguimiento: boolean;
}

export interface ClinicaAccionDto {
  id: number;
  accion: 'Aceptar' | 'Rechazar' | 'CheckIn' | 'Completar' | 'No Asistió';
  motivoRechazo?: string;
  checkInHora?: string;
  emoResultadoId?: number;
  nuevaFecha?: string;
  horaNueva?: string;
  /** Solo con accion 'Aceptar' (incluye Reprogramar): corrige el tipo de EMO si la clínica se equivocó al programar. */
  tipoEmoId?: number;
  /** Solo con accion 'Rechazar': si es false, no se envía el correo de notificación de rechazo. Default true. */
  enviarCorreo?: boolean;
}

export type EstadoProgramacionClinica =
  | 'Programado'
  | 'Aceptado por Clínica'
  | 'Rechazado por Clínica'
  | 'En Atención'
  | 'Completado'
  | 'No se presentó'
  | 'Cancelado';
