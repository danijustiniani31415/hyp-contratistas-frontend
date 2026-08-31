export type ConvalidacionResultado = 'Aprobada' | 'Rechazada' | 'Pendiente' | string;

export type RiesgoEmo = 'Bajo' | 'Alto' | string;

export interface ConvalidacionListDto {
  id: number;
  emoOrigenId: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  empresaOrigen: string;
  empresaDestinoId?: number | null;
  empresaDestino: string;
  proyecto?: string | null;
  fechaConvalidacion: string;
  fechaVencimiento: string;
  resultado: ConvalidacionResultado;
  medico?: string;
  tipoEmo?: string;
  fechaEmoOrigen?: string;
  notas?: string;
  diasParaVencer: number | null;

  // Datos del EMO origen, para revisión del médico antes de resolver.
  emoFechaVencimiento?: string | null;
  urlResultado?: string | null;
  urlAptitud?: string | null;
  urlEmoCompleto?: string | null;
  interconsultaEstado?: string | null;
  interconsultaEspecialidad?: string | null;
  interconsultaUrlInforme?: string | null;

  // Cambio de puesto: datos y evaluación de riesgo.
  puestoOrigen?: string | null;
  puestoDestino?: string | null;
  categoriaOrigen?: string | null;
  categoriaDestino?: string | null;
  obraOficinaStaffOrigenId?: number | null;
  obraOficinaStaffOrigenNombre?: string | null;
  obraOficinaStaffDestinoId?: number | null;
  obraOficinaStaffDestinoNombre?: string | null;
  riesgoOrigen?: RiesgoEmo | null;
  riesgoDestino?: RiesgoEmo | null;
  cambioRiesgo?: boolean;
}

export interface ConvalidacionCreateDto {
  emoOrigenId: number;
  empresaDestinoId: number;
  fechaConvalidacion: string;
  fechaVencimiento: string;
  medicoId?: number;
  resultado: ConvalidacionResultado;
  notas?: string;
  puestoOrigen?: string;
  puestoDestino?: string;
  obraOficinaStaffOrigenId?: number;
  obraOficinaStaffDestinoId?: number;
  pinFirma?: string;
  microsoftAccessToken?: string;
}
