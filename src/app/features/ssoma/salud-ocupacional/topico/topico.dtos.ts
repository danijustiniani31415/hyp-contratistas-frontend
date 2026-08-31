export interface TopicoAtencionDto {
  id: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  fecha: string;           // ISO date 'YYYY-MM-DD'
  hora?: string;           // 'HH:mm:ss'
  tipoAtencionId: number;
  tipoAtencionNombre?: string;
  motivo?: string;
  diagnostico?: string;
  diagnosticoCie10?: string;
  tratamiento?: string;
  medicamentos?: string;
  presionArterial?: string;
  temperatura?: number;
  frecuenciaCardiaca?: number;
  saturacionOxigeno?: number;
  peso?: number;
  derivadoClinica: boolean;
  clinicaDerivacion?: string;
  generaDescanso: boolean;
  descansoDias?: number;
  generaAccidente: boolean;
  accidenteId?: number;
  proyectoId?: number;
  proyectoNombre?: string;
  empresaId?: number;
  empresaNombre?: string;
  observaciones?: string;
  sctrActivado: boolean;
  tipoCasoSctr?: string;
  urlInforme?: string;
  descansoGeneradoId?: number;
  estado: string;
  fechaCierre?: string;
  registradoPorId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopicoFiltrosDto {
  fechaDesde?: string;
  fechaHasta?: string;
  workerId?: number;
  tipoAtencionId?: number;
  proyectoId?: number;
  estado?: string;
  page?: number;
  pageSize?: number;
}

export interface CrearTopicoAtencionDto {
  workerId: number;
  fecha: string;
  hora?: string;
  tipoAtencionId: number;
  motivo?: string;
  diagnostico?: string;
  diagnosticoCie10?: string;
  tratamiento?: string;
  medicamentos?: string;
  presionArterial?: string;
  temperatura?: number;
  frecuenciaCardiaca?: number;
  saturacionOxigeno?: number;
  peso?: number;
  derivadoClinica: boolean;
  clinicaDerivacion?: string;
  generaDescanso: boolean;
  descansoDias?: number;
  generaAccidente: boolean;
  proyectoId?: number;
  empresaId?: number;
  observaciones?: string;
  sctrActivado?: boolean;
  tipoCasoSctr?: string;
}

export interface ActualizarTopicoAtencionDto extends Partial<CrearTopicoAtencionDto> {}

export interface TopicoTipoAtencionDto {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface TopicoEvolucionDto {
  id: number;
  atencionId: number;
  fechaEvolucion: string;
  notaEvolucion: string;
  registradoPorId?: number;
  registradoPorNombre?: string;
  urlEvidencia?: string;
  createdAt: string;
}

export interface TopicoEvolucionCreateDto {
  notaEvolucion: string;
}
