export interface AccidenteTrabajoListItemDto {
  id: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  empresaNombre?: string;
  proyectoNombre?: string;
  fechaAccidente: string;
  tipoAccidente?: string;
  lugarAccidente?: string;
  estado: string;
  notificadoSunafil: boolean;
  totalSeguimientos: number;
  flashReportId?: number;
  tieneAlta: boolean;
  requiereReinduccion: boolean;
  reinduccionCompletada: boolean;
  fechaReinduccion?: string;
  createdAt: string;
}

export interface AccidenteTrabajoUpdateDto {
  lugarAccidente?: string;
  tipoAccidente?: string;
  mecanismo?: string;
  parteCuerpoAfectada?: string;
  agenteRiesgoId?: number | null;
  descripcion: string;
  descripcionLesion?: string;
  diagnosticoCie10?: string;
  requiereHospitalizacion: boolean;
  hospitalNombre?: string;
  diasDescansoEstimados: number;
  diasDescansoReales?: number;
  notificadoSunafil: boolean;
  fechaNotificacionSunafil?: string;
  numeroNotificacionSunafil?: string;
  restriccionesReintegro?: string;
}

export interface AccidenteFilterDto {
  workerId?: number;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  empresaId?: number;
  proyectoId?: number;
  page?: number;
}

// --- Sub-colecciones del detalle ---

export interface DescansoMedicoItemDto {
  id: number;
  workerId: number;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  estado: string;
  createdAt: string;
}

export interface CitaMedicaItemDto {
  id: number;
  accidenteId: number;
  tipoId: number;
  tipoNombre: string;
  fechaCita: string;
  horaCita?: string;
  clinica?: string;
  medico?: string;
  diagnostico?: string;
  indicaciones?: string;
  proximaCita?: string;
  urlEvidencia?: string;
  observaciones?: string;
  createdAt: string;
}

export interface EquipoPrestadoItemDto {
  id: number;
  accidenteId: number;
  tipoEquipoId: number;
  tipoEquipoNombre: string;
  cantidad: number;
  fechaPrestamo: string;
  fechaDevolucion?: string;
  devuelto: boolean;
  observaciones?: string;
  urlEvidencia?: string;
  createdAt: string;
}

export interface AltaMedicaItemDto {
  id: number;
  accidenteId: number;
  tipoId: number;
  tipoNombre: string;
  fechaAlta: string;
  medico?: string;
  diagnosticoFinal?: string;
  tieneRestriccion: boolean;
  descripcionRestriccion?: string;
  fechaFinRestriccion?: string;
  urlCertificado?: string;
  observaciones?: string;
  createdAt: string;
}

// --- Catálogos ---

export interface TipoItemDto {
  id: number;
  nombre: string;
}

export interface TiposSeguimientoDto {
  tiposCita: TipoItemDto[];
  tiposEquipo: TipoItemDto[];
  tiposAlta: TipoItemDto[];
}

// --- Create / Update DTOs ---

export interface CitaMedicaCreateDto {
  tipoId: number;
  fechaCita: string;
  horaCita?: string;
  clinica?: string;
  medico?: string;
  diagnostico?: string;
  indicaciones?: string;
  proximaCita?: string;
  urlEvidencia?: string;
  observaciones?: string;
}

export interface EquipoPrestadoCreateDto {
  tipoEquipoId: number;
  cantidad: number;
  fechaPrestamo: string;
  observaciones?: string;
  urlEvidencia?: string;
}

export interface EquipoPrestadoDevolverDto {
  fechaDevolucion: string;
  observaciones?: string;
}

export interface AltaMedicaCreateDto {
  tipoId: number;
  fechaAlta: string;
  medico?: string;
  diagnosticoFinal?: string;
  tieneRestriccion: boolean;
  descripcionRestriccion?: string;
  fechaFinRestriccion?: string;
  urlCertificado?: string;
  observaciones?: string;
}

export interface AccidenteTrabajoDetalleDto {
  id: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  workerTelefono?: string;
  empresaNombre?: string;
  proyectoNombre?: string;
  fechaAccidente: string;
  horaAccidente?: string;
  tipoAccidente?: string;
  lugarAccidente?: string;
  mecanismo?: string;
  parteCuerpoAfectada?: string;
  agenteRiesgoId?: number;
  agenteRiesgoNombre?: string;
  descripcion?: string;
  descripcionLesion?: string;
  diagnosticoCie10?: string;
  requiereHospitalizacion: boolean;
  hospitalNombre?: string;
  estado: string;
  notificadoSunafil: boolean;
  fechaNotificacionSunafil?: string;
  numeroNotificacionSunafil?: string;
  restriccionesReintegro?: string;
  diasDescansoEstimados: number;
  diasDescansoReales?: number;
  flashReportId?: number;
  casoSocialId?: string;
  tieneAlta: boolean;
  requiereReinduccion: boolean;
  reinduccionCompletada: boolean;
  fechaReinduccion?: string;
  createdAt: string;
  descansos: DescansoMedicoItemDto[];
  citas: CitaMedicaItemDto[];
  equipos: EquipoPrestadoItemDto[];
  altaMedica?: AltaMedicaItemDto;
}
