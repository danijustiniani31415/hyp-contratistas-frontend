export interface RacListQuery {
  proyectoId?: number;
  estado?: string;
  severidad?: string;
  tipo?: string;
  empresaReportadaId?: number;
  empresaReportanteId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  soloConPenalidad?: boolean;
  page?: number;
  pageSize?: number;
}

export interface RacPagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RacCreateRequest {
  proyectoId: number;
  tipo: string;
  categoriaId: number;
  severidad: string;
  esAnonimoReportante: boolean;
  reportanteId?: number;
  reportanteNombre?: string;
  reportanteCargo?: string;
  empresaReportanteId?: number;
  esAnonimoObservado: boolean;
  observadoWorkerId?: number;
  observadoWorkerIds?: number[];
  empresaReportadaId?: number;
  proyectoPiso?: string;
  lugarDescripcion?: string;
  latitud?: number;
  longitud?: number;
  descripcion: string;
  accionRequerida?: string;
  planAccion?: string;
  fechaReporte: string;
  plazoLevantamiento?: string;
  aplicaPenalidad: boolean;
  infraccionId?: number;
  descripcionOcurrido?: string;
}

export interface RacCerrarRequest {
  cierreDescripcion: string;
  fotoCierreUrl?: string;
}

export interface RacFotoDto {
  id: number;
  url: string;
  tipo: string;
  nombreArchivo?: string;
  orden: number;
}

export interface RacPenalidadResumenDto {
  id: number;
  codigo: string;
  estado: string;
  montoCalculado: number;
  infraccionNombre?: string;
}

export interface RacListItemDto {
  id: number;
  codigo: string;
  proyectoNombre?: string;
  proyectoAbreviacion?: string;
  tipo: string;
  categoriaNombre: string;
  categoriaAmbito: string;
  severidad: string;
  estado: string;
  fechaReporte: string;
  plazoLevantamiento?: string;
  aplicaPenalidad: boolean;
  empresaReportadaNombre?: string;
  empresaReportanteNombre?: string;
  reportanteNombre?: string;
  descripcion?: string;
}

export interface RacDetalleDto {
  id: number;
  codigo: string;
  proyectoId?: number;
  proyectoNombre?: string;
  tipo: string;
  categoriaId: number;
  categoriaNombre: string;
  categoriaAmbito: string;
  severidad: string;
  esAnonimoReportante: boolean;
  reportanteId?: number;
  reportanteNombre?: string;
  reportanteCargo?: string;
  empresaReportanteId?: number;
  empresaReportanteNombre?: string;
  esAnonimoObservado: boolean;
  observadoWorkerId?: number;
  observadoNombre?: string;
  empresaReportadaId?: number;
  empresaReportadaNombre?: string;
  proyectoPiso?: string;
  lugarDescripcion?: string;
  latitud?: number;
  longitud?: number;
  descripcion: string;
  planAccion?: string;
  fechaReporte: string;
  plazoLevantamiento?: string;
  estado: string;
  fechaCierre?: string;
  cierreDescripcion?: string;
  cerradoPorNombre?: string;
  cerradoPorCargo?: string;
  aplicaPenalidad: boolean;
  pdfUrl?: string;
  createdAt: string;
  fotos: RacFotoDto[];
  penalidad?: RacPenalidadResumenDto;
}

export interface RacDashboardDto {
  totalAbiertos: number;
  totalCerrados: number;
  totalConPenalidad: number;
  criticosAbiertos: number;
  altosAbiertos: number;
  vencidosAbiertos: number;
  totalReportados: number;
  totalReportadosCerrados: number;
  porProyecto: RacPorProyectoDto[];
  porCategoria: RacPorCategoriaDto[];
  tendencia: RacTendenciaDto[];
}

export interface RacPorProyectoDto {
  proyectoId: number;
  proyectoNombre: string;
  total: number;
  abiertos: number;
  cerrados: number;
}

export interface RacPorCategoriaDto {
  categoriaNombre: string;
  ambito: string;
  total: number;
}

export interface RacTendenciaDto {
  anio: number;
  mes: number;
  total: number;
  actos: number;
  condiciones: number;
}

export interface RacCategoriaDto {
  id: number;
  nombre: string;
  tipo: string;
  ambito?: string;
  orden: number;
}

export interface RacInfraccionDto {
  id: number;
  nombre: string;
  tipo?: string;    // ACTO | CONDICION
  ambito?: string;
  orden: number;
  montoFijo?: number;
  factorUit?: number;
}

export interface RacCreadoDto {
  id: number;
  codigo: string;
  penalidadId?: number;
  penalidadCodigo?: string;
}

export interface RacFotoUploadResult {
  id: number;
  url: string;
  tipo: string;
  nombreArchivo: string;
}

export interface PenalidadListQuery {
  empresaId?: number;
  proyectoId?: number;
  estado?: string;
  page?: number;
  pageSize?: number;
}

export interface PenalidadListItemDto {
  id: number;
  codigo: string;
  racCodigo: string;
  racId: number;
  proyectoNombre?: string;
  empresaNombre?: string;
  infraccionNombre?: string;
  montoCalculado: number;
  estado: string;
  createdAt: string;
  descargoFecha?: string;
  resueltaEn?: string;
}

export interface PenalidadDetalleDto extends PenalidadListItemDto {
  empresaId?: number;
  proyectoId?: number;
  infraccionId?: number;
  descripcionOcurrido?: string;
  descargoTexto?: string;
  documentoUrl?: string;
  resolucionTexto?: string;
  pdfResolucionUrl?: string;
}

export interface PenalidadDescargaRequest {
  descargoTexto: string;
  documentoUrl: string;
}

export interface PenalidadResolverRequest {
  tipo: string;
  resolucionTexto?: string;
}
