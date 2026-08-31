// ── Catálogos ─────────────────────────────────────────────────────────────────
export interface OptPetDto {
  id: number;
  nombre: string;
  codigo?: string;
  sharepointUrl?: string;
}

export interface OptCriterioVerificacionDto {
  id: number;
  pregunta: string;
  orden: number;
}

// ── Request ────────────────────────────────────────────────────────────────────
export interface OptTrabajadorRequest {
  trabajadorId: number;
  tipoTrabajador?: string;
  tiempoEnObra?: string;
  aniosExperiencia?: string;
  firmaTrabajadorBase64?: string;
}

export interface OptVerificacionRequest {
  criterioId: number;
  resultado: boolean;
}

export interface OptPasoRequest {
  numeroDisplay: string;
  descripcion: string;
  nivel: number;
  resultado?: string;
  desviacionObservada?: string;
  orden: number;
}

export interface CrearOptRequest {
  proyectoId: number;
  petId?: number;
  fecha: string;
  tipoObservacion: string;
  cuentaConPet: boolean;
  area?: string;
  seInformaTrabajador: boolean;
  observadorId?: number;
  observadorNombre?: string;
  observadorCargo?: string;
  firmaObservadorBase64?: string;
  seFelicito: boolean;
  seRecibieronComentarios: boolean;
  seRetroalimento: boolean;
  seObtuvoCCompromiso: boolean;
  accionRequerida?: string;
  accionObservacion?: string;
  trabajadores: OptTrabajadorRequest[];
  verificaciones: OptVerificacionRequest[];
  pasos: OptPasoRequest[];
  fotosAreaBase64?: string[];
}

// ── Respuesta lista ────────────────────────────────────────────────────────────
export interface OptListItemDto {
  id: number;
  proyectoNombre: string;
  petNombre?: string;
  fecha: string;
  tipoObservacion: string;
  area?: string;
  observadorNombre?: string;
  observadorEmpresaNombre?: string;
  trabajadoresPrincipal: string;
  trabajadorPrincipalEmpresaNombre?: string;
  totalTrabajadores: number;
  scorePct?: number;
  accionRequerida?: string;
  estado: string;
  createdAt: string;
}

export interface OptPagedResult {
  data: OptListItemDto[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface OptListQuery {
  proyectoId?: number;
  petId?: number;
  tipoObservacion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  trabajadorId?: number;
  empresaObservadorId?: number;
  empresaTrabajadorId?: number;
  page?: number;
  pageSize?: number;
}

// ── Detalle ────────────────────────────────────────────────────────────────────
export interface OptTrabajadorDto {
  id: number;
  trabajadorId: number;
  nombreTrabajador: string;
  dni?: string;
  tipoTrabajador?: string;
  tiempoEnObra?: string;
  aniosExperiencia?: string;
  firmaTrabajadorUrl?: string;
  empresaId?: number;
  empresaNombre?: string;
}

export interface OptVerificacionDto {
  criterioId: number;
  pregunta: string;
  resultado: boolean;
}

export interface OptPasoDto {
  id: number;
  numeroDisplay: string;
  descripcion: string;
  nivel: number;
  resultado?: string;
  desviacionObservada?: string;
  orden: number;
}

export interface OptDetalleDto {
  id: number;
  proyectoId: number;
  proyectoNombre: string;
  petId?: number;
  petNombre?: string;
  petSharepointUrl?: string;
  fecha: string;
  tipoObservacion: string;
  cuentaConPet: boolean;
  area?: string;
  seInformaTrabajador: boolean;
  observadorId?: number;
  observadorNombre?: string;
  observadorCargo?: string;
  observadorEmpresaId?: number;
  observadorEmpresaNombre?: string;
  firmaObservadorUrl?: string;
  seFelicito: boolean;
  seRecibieronComentarios: boolean;
  seRetroalimento: boolean;
  seObtuvoCCompromiso: boolean;
  accionRequerida?: string;
  accionObservacion?: string;
  totalPasos: number;
  totalSeguros: number;
  totalInseguros: number;
  scorePct?: number;
  estado: string;
  createdAt: string;
  trabajadores: OptTrabajadorDto[];
  verificaciones: OptVerificacionDto[];
  pasos: OptPasoDto[];
  fotosArea: string[];
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export interface OptScoreMensualDto {
  anio: number;
  mes: number;
  mesNombre: string;
  scorePromedio?: number;
  totalOpts: number;
}

export interface OptEmpresaRankingDto {
  empresaId: number;
  empresaNombre: string;
  scorePromedio?: number;
  totalOpts: number;
}

export interface OptTrabajadorRiesgoDto {
  trabajadorId: number;
  nombreTrabajador: string;
  empresa?: string;
  scorePromedio?: number;
  totalOpts: number;
  totalInseguros: number;
}

export interface OptAccionResumenDto {
  tipoAccion: string;
  cantidad: number;
}

export interface OptDashboardDto {
  totalOpts: number;
  totalEsteMes: number;
  scorePromedioGlobal?: number;
  scorePromedioEsteMes?: number;
  accionesPendientes: number;
  tendenciaMensual: OptScoreMensualDto[];
  rankingEmpresas: OptEmpresaRankingDto[];
  topTrabajadoresRiesgo: OptTrabajadorRiesgoDto[];
  accionesRequeridas: OptAccionResumenDto[];
}

export interface OptCatalogosDto {
  pets: OptPetDto[];
  criterios: OptCriterioVerificacionDto[];
}
