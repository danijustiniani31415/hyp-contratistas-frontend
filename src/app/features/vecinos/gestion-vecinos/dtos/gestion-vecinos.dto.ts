import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';

export interface ProjectOptionDTO {
  projectId: number;
  projectDescription: string;
}

export interface CatalogOptionDTO {
  id: number;
  descripcion: string;
}

export interface VecinoFormOptionsDTO {
  projects: ProjectOptionDTO[];
  colindancias: CatalogOptionDTO[];
  tiposConstruccion: CatalogOptionDTO[];
  usos: CatalogOptionDTO[];
  relacionTipos: CatalogOptionDTO[];
}

/** Una imagen del estado de la propiedad. */
export interface VecinoImagenDTO {
  vecinoImagenId: number;
  archivoUrl: string;
  originalFileName?: string | null;
}

/** Una persona asociada a una casa/lote. */
export interface VecinoPersonaDTO {
  vecinoPersonaId: number;
  nombre: string;
  dni?: string | null;
  celular?: string | null;
  vecinoRelacionTipoId: number;
  relacionDescripcion: string;
}

export interface VecinoListItemDTO {
  vecinoId: number;
  /** Lote/edificio al que pertenece este vecino/departamento. */
  vecinoLoteId: number;
  projectId: number;
  projectDescription: string;
  predio?: string | null;
  vecinoUsoId?: number | null;
  usoDescripcion?: string | null;
  /** Dirección del lote (puede ser nula si el lote aún no tiene dirección). */
  direccion?: string | null;
  interiorDepartamento?: string | null;
  /** Nombre de la persona principal (propietario), para mostrar en tabla/tarjeta. */
  nombrePropietario?: string | null;
  /** DNI de la persona principal, si tiene. */
  dni?: string | null;
  celular?: string | null;
  /** Todas las personas asociadas a la casa. */
  personas: VecinoPersonaDTO[];
  vecinoColindanciaId: number;
  colindanciaDescripcion: string;
  vecinoTipoConstruccionId: number;
  tipoConstruccionDescripcion: string;
  observaciones?: string | null;
  imagenes: VecinoImagenDTO[];
  createdDateTime: string;
  solicitudesCount: number;
  compromisosCount: number;
  solicitudesAprobadas: number;
  solicitudesEvaluables: number;
  entregablesAprobados: number;
  entregablesEvaluables: number;
  requisitosSubidos: number;
  requisitosEvaluables: number;
}

export interface VecinosPageDTO {
  options: VecinoFormOptionsDTO;
  vecinos: PagedResponseDTO<VecinoListItemDTO>;
}

export interface VecinoSolicitudItemDTO {
  vecinoSolicitudId: number;
  vecinoId: number;
  descripcion: string;
  esCritica: boolean;
  vecinoSolicitudEstadoId: number;
  estadoDescripcion: string;
  createdDateTime: string;
}

export interface VecinoSolicitudesResponseDTO {
  solicitudes: VecinoSolicitudItemDTO[];
  estados: CatalogOptionDTO[];
  compromisoEstados: CatalogOptionDTO[];
  entregableEstados: CatalogOptionDTO[];
}

export interface VecinoEntregableItemDTO {
  vecinoCompromisoEntregableId: number;
  vecinoEntregableTipoId: number;
  tipoDescripcion: string;
  orden: number;
  vecinoEntregableEstadoId: number;
  estadoDescripcion: string;
  archivoUrl?: string | null;
  originalFileName?: string | null;
}

/** Un archivo de "normativas" de un compromiso (sección multi-archivo). */
export interface VecinoNormativaDTO {
  vecinoCompromisoNormativaId: number;
  archivoUrl: string;
  originalFileName?: string | null;
}

export interface VecinoCompromisoItemDTO {
  vecinoCompromisoId: number;
  vecinoSolicitudId: number;
  descripcion: string;
  esCritico: boolean;
  vecinoCompromisoEstadoId: number;
  estadoDescripcion: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  /** Fecha límite por municipalidad/fiscalización (si la tiene, el compromiso está priorizado). */
  fechaFinMunicipalidad?: string | null;
  observaciones?: string | null;
  createdDateTime: string;
  entregables: VecinoEntregableItemDTO[];
  normativas: VecinoNormativaDTO[];
}

export interface VecinoCompromisoCreateDTO {
  descripcion: string;
  esCritico: boolean;
  vecinoCompromisoEstadoId?: number | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  fechaFinMunicipalidad?: string | null;
  observaciones?: string | null;
}

export interface VecinoSolicitudCreateDTO {
  descripcion: string;
  esCritica: boolean;
}

// ── Vista por croquis ────────────────────────────────────────────────────
/** Un lote (polígono) con sus vecinos/departamentos y KPIs agregados. */
export interface CroquisGestionLoteDTO {
  projectCroquisLoteId: number;
  numeroLote: string;
  puntos: number[][];
  /** Lote/edificio que representa el polígono (null si aún no tiene lote registrado). */
  vecinoLoteId?: number | null;
  direccion?: string | null;
  observaciones?: string | null;
  vecinosCount: number;
  solicitudesCount: number;
  compromisosCount: number;
  solicitudesAprobadas: number;
  solicitudesEvaluables: number;
  entregablesAprobados: number;
  entregablesEvaluables: number;
  requisitosSubidos: number;
  requisitosEvaluables: number;
  /** Vecinos/departamentos registrados en este lote. */
  vecinos: VecinoListItemDTO[];
}

export interface CroquisGestionDTO {
  projectId: number;
  projectDescription: string;
  projectCroquisId: number;
  imageUrl: string;
  solicitudesCount: number;
  compromisosCount: number;
  compromisosPendientes: number;
  compromisosEnProceso: number;
  compromisosCulminados: number;
  compromisosLimitePendientes: number;
  compromisosLimiteEnProceso: number;
  compromisosLimiteCulminados: number;
  solicitudesAprobadas: number;
  solicitudesEvaluables: number;
  entregablesAprobados: number;
  entregablesEvaluables: number;
  requisitosSubidos: number;
  requisitosEvaluables: number;
  /** Cantidad de lotes/edificios del proyecto. */
  lotesCount: number;
  /** Cantidad de vecinos/departamentos del proyecto. */
  vecinosCount: number;
  lotes: CroquisGestionLoteDTO[];
}

export interface CroquisGestionResponseDTO {
  croquis: CroquisGestionDTO[];
  projects: ProjectOptionDTO[];
  colindancias: CatalogOptionDTO[];
  tiposConstruccion: CatalogOptionDTO[];
  usos: CatalogOptionDTO[];
  relacionTipos: CatalogOptionDTO[];
}

// ── Requisitos (Gestión de requisitos) ────────────────────────────────────
export interface VecinoRequisitoItemDTO {
  vecinoRequisitoId: number | null;
  vecinoRequisitoTipoId: number;
  tipoDescripcion: string;
  orden: number;
  vecinoRequisitoEstadoId: number;
  estadoDescripcion: string;
  archivoUrl?: string | null;
  originalFileName?: string | null;
}

export interface VecinoRequisitosResponseDTO {
  requisitos: VecinoRequisitoItemDTO[];
  estados: CatalogOptionDTO[];
}

// ── Calendario de limpiezas ────────────────────────────────────────────────
export interface VecinoLimpiezaDTO {
  vecinoLimpiezaId: number;
  /** Fecha ISO (yyyy-MM-dd). */
  fecha: string;
  vecinoLimpiezaTipoId: number;
  tipoDescripcion: string;
  vecinoId?: number | null;
  vecinoNombre?: string | null;
  vecinoDireccion?: string | null;
  vecinoInterior?: string | null;
  descripcion?: string | null;
  atencionArchivoUrl?: string | null;
  atencionOriginalFileName?: string | null;
  atencionVecinoCompromisoId?: number | null;
  atencionCompromisoLabel?: string | null;
}

/** Opción de compromiso de un vecino para relacionar la atención. */
export interface VecinoCompromisoSelectDTO {
  vecinoCompromisoId: number;
  label: string;
}

export interface VecinoLimpiezasResponseDTO {
  limpiezas: VecinoLimpiezaDTO[];
  tipos: CatalogOptionDTO[];
}

export interface VecinoLimpiezaCreateDTO {
  fecha: string;
  vecinoLimpiezaTipoId: number | null;
  vecinoId?: number | null;
  descripcion?: string | null;
}

/** Cumplimiento de atenciones de limpieza (programadas hasta hoy vs. hechas). */
export interface VecinoLimpiezaCumplimientoDTO {
  departamentoProgramadas: number;
  departamentoHechas: number;
  comunProgramadas: number;
  comunHechas: number;
  totalProgramadas: number;
  totalHechas: number;
}

/** Una persona del formulario de alta (DNI opcional). */
export interface VecinoPersonaCreateDTO {
  nombre: string;
  dni: string;
  celular: string;
  vecinoRelacionTipoId: number | null;
}

/** Persona dentro del formulario de edición (id presente = existente; null = nueva). */
export interface VecinoPersonaUpsertDTO {
  vecinoPersonaId: number | null;
  nombre: string;
  dni: string;
  celular: string;
  vecinoRelacionTipoId: number | null;
}

/** Edición de un vecino/departamento (sección Detalle) + sus personas.
 *  La dirección/observaciones se editan aparte (a nivel de lote). */
export interface VecinoUpdateDTO {
  vecinoUsoId: number | null;
  interiorDepartamento: string;
  vecinoColindanciaId: number | null;
  vecinoTipoConstruccionId: number | null;
  personas: VecinoPersonaUpsertDTO[];
}

/** Edición de los datos a nivel de lote (dirección + observaciones). */
export interface VecinoLoteUpdateDTO {
  direccion: string;
  observaciones: string;
}

/** Un vecino/departamento del formulario de alta. */
export interface VecinoDepartamentoCreateDTO {
  vecinoUsoId: number | null;
  interiorDepartamento: string;
  vecinoColindanciaId: number | null;
  vecinoTipoConstruccionId: number | null;
  personas: VecinoPersonaCreateDTO[];
}

/** Alta de vecinos sobre un lote existente (polígono del croquis). */
export interface VecinoLoteRegisterDTO {
  projectCroquisLoteId: number;
  direccion: string;
  observaciones: string;
  vecinos: VecinoDepartamentoCreateDTO[];
}

export interface VecinoLoteRegisterResultDTO {
  vecinoLoteId: number;
  vecinoIds: number[];
}
