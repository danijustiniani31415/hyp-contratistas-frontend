import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';

/**
 * Tipo de descanso (ss_descanso_tipo) — único clasificador. En Descansos se muestran los 4
 * (`nombre`); en Mi Salud solo los "común" y con `nombreCorto`.
 */
export interface DescansoTipoDto {
  id: number;
  nombre: string;
  nombreCorto: string;
}

export interface DescansoAdjuntoDto {
  /** Id del adjunto: el archivo se pide al backend por este id, no por su url de SharePoint. */
  id: number;
  url: string;
  nombre?: string;
}

export interface DescansoMedicoListItemDto {
  id: number;
  casoId: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  empresaNombre?: string;
  tipoId: number;
  /** Nombre del tipo resuelto en el backend desde el catálogo. */
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  estado: string;
  topicoOrigenId?: number;
  trabajadorBloqueado: boolean;
  reportadoPorTrabajador: boolean;
  createdAt: string;
}

export interface DescansoMedicoDetalleDto {
  id: number;
  casoId: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  proyectoId?: number;
  empresaId?: number;
  empresaNombre?: string;
  tipoId: number;
  /** Nombre del tipo resuelto en el backend desde el catálogo. */
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  diagnostico?: string;
  /** LEGACY, ver diagnosticoCie10Codigo. */
  diagnosticoCie10?: string;
  /** FK a cie10_catalogo. Solo el médico lo asigna al revisar el caso. */
  diagnosticoCie10Codigo?: string;
  diagnosticoCie10Descripcion?: string;
  urlCertificado?: string;
  urlDocumento?: string;
  adjuntos: DescansoAdjuntoDto[];
  estado: string;
  motivoRechazo?: string;
  aprobadoPorId?: number;
  fechaAprobacion?: string;
  accidenteId?: number;
  esRecaida: boolean;
  topicoOrigenId?: number;
  prorrogaDelId?: number;
  /** LEGACY — el alta ahora vive en el Caso (ver CasoDetalleDto), no en el descanso. */
  fechaAlta?: string;
  altaPorId?: number;
  altaObservaciones?: string;
  notificadoGth: boolean;
  notificadoJefe: boolean;
  reportadoPorTrabajador: boolean;
  observaciones?: string;
  registradoPorId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DescansoMedicoCreateDto {
  workerId: number;
  tipoId: number;
  fechaInicio: string;
  fechaFin: string;
  diagnostico?: string;
  diagnosticoCie10Codigo?: string;
  accidenteId?: number;
  esRecaida?: boolean;
  topicoOrigenId?: number;
  /** "Añadir más descanso" sobre un caso abierto: id del descanso que se extiende. */
  prorrogaDelId?: number;
  /** Solo para el flujo de reapertura: nuevo descanso directo sobre un caso reabierto. */
  casoId?: number;
  proyectoId?: number;
  empresaId?: number;
}

export interface DescansoMedicoUpdateDto {
  tipoId: number;
  fechaInicio: string;
  fechaFin: string;
  diagnostico?: string;
  diagnosticoCie10Codigo?: string;
}

export interface DescansoAprobarDto {
  observaciones?: string;
}

export interface DescansoRechazarDto {
  motivoRechazo: string;
}

export interface DarAltaDto {
  observaciones?: string;
}

export interface DescansoSeguimientoDto {
  id: number;
  descansoId: number;
  casoId: number;
  fechaSeguimiento: string;
  /** LEGACY, ver tipoId/tipoNombre. */
  tipo: string;
  tipoId?: number;
  tipoNombre?: string;
  realizadoPorRol?: string;
  realizadoPorId?: number;
  /** null si es confidencial y quien pide no tiene permiso de ver detalle clínico. */
  nota?: string;
  proximaCita?: string;
  urlEvidencia?: string;
  diagnosticoCie10Codigo?: string;
  diagnosticoCie10Descripcion?: string;
  puestoTrabajoSnapshot?: string;
  confidencial: boolean;
  createdAt: string;
}

export interface DescansoSeguimientoCreateDto {
  /** Sobre cuál descanso puntual — si no se envía, se asume el más reciente del caso. */
  descansoId?: number;
  /** Sin uso — solo el médico registra seguimiento, no hace falta clasificar "quién" lo hizo. */
  tipoId?: number;
  nota?: string;
  proximaCita?: string;
  urlEvidencia?: string;
  diagnosticoCie10Codigo?: string;
  confidencial?: boolean;
}

export interface SeguimientoTipoDto {
  id: number;
  nombre: string;
}

export interface Cie10Dto {
  codigo: string;
  descripcion: string;
}

/** Timeline completo de un caso: descansos + seguimientos + estado del alta. */
export interface CasoDetalleDto {
  id: number;
  workerId: number;
  workerNombre?: string;
  workerDni?: string;
  fechaApertura: string;
  /** "Abierto" | "Cerrado". */
  estado: string;
  fechaCierre?: string;
  altaPorId?: number;
  altaObservaciones?: string;
  fechaReapertura?: string;
  descansos: DescansoMedicoListItemDto[];
  seguimientos: DescansoSeguimientoDto[];
}

export interface ReabrirCasoDto {
  observaciones?: string;
}

/** Un caso candidato para vincular un descanso suelto (el que crea el trabajador al subir
 * desde Mi Salud, que nace como caso propio de un solo descanso). */
export interface CasoCandidatoDto {
  id: number;
  fechaApertura: string;
  primerDescansoInicio: string;
  primerDescansoFin: string;
  primerDescansoTipo: string;
}

export interface DescansoFilterDto {
  workerId?: number;
  estado?: string;
  /** null = "Todos" (lo que emite el combobox al limpiar); toParams lo omite de la query. */
  tipoId?: number | null;
  empresaId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
}

/** Respuesta de la carga inicial: catálogo de tipos + primera página, en una sola petición. */
export interface DescansosInicioDto {
  tipos: DescansoTipoDto[];
  descansos: PagedResponseDTO<DescansoMedicoListItemDto>;
}
