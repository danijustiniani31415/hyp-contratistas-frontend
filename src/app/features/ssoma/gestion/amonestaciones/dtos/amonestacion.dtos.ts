export interface TipoSancionDto {
  id: number;
  nombre: string;
  nivelGravedad: string;
  generaSuspension: boolean;
}

export interface InfraccionTipoDto {
  id: number;
  nombre: string;
}

export interface AmonCatalogoItem {
  id: number;
  nombre: string;
  montoFijo?: number;
  factorUit?: number;
}

export interface AmonPartidaItem {
  id: number;
  nombre: string;
}

export interface AmonestacionInitDto {
  tiposSancion: TipoSancionDto[];
  infraccionesTipo: InfraccionTipoDto[];
  racInfracciones: AmonCatalogoItem[];
  proyectos: AmonCatalogoItem[];
  partidas: AmonPartidaItem[];
  uitActual: number;
}

export interface AmonFotoUpload {
  base64: string;
  nombreArchivo: string;
}

export interface AmonestacionCreateRequest {
  proyectoId: number;
  fecha: string;
  workerId: number;
  partidaId?: number;
  tipoSancionId: number;
  infraccionTipoId: number;
  descripcion: string;
  aplicaPenalizacion: boolean;
  sancionInfraccionId?: number;
  puntosInfraccion: number;
  diasSuspension?: number;
  fechaInicioSuspension?: string;
  fechaFinSuspension?: string;
  fotos: AmonFotoUpload[];
  estado?: 'Borrador' | 'Registrada';
}

export interface AmonestacionCreadaDto {
  id: number;
  codigo: string;
}

export interface AmonestacionListQuery {
  proyectoId?: number;
  workerId?: number;
  tipoSancionId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  workerSearch?: string;
  empresaNombre?: string;
  estado?: string;
  page?: number;
  pageSize?: number;
}

export interface AmonestacionListItemDto {
  id: number;
  codigo: string;
  proyectoNombre: string;
  fecha: string;
  workerNombre: string;
  workerDni: string;
  empresaNombre: string;
  tipoSancionNombre: string;
  nivelGravedad: string;
  infraccionTipoNombre: string;
  descripcion: string;
  puntosInfraccion: number;
  aplicaPenalizacion: boolean;
  montoCalculado: number;
  estado: string;
}

export interface AmonestacionEditRequest {
  tipoSancionId?: number;
  infraccionTipoId?: number;
  descripcion?: string;
  puntosInfraccion?: number;
  aplicaPenalizacion?: boolean;
  sancionInfraccionId?: number;
  diasSuspension?: number;
  fechaInicioSuspension?: string;
  fechaFinSuspension?: string;
  motivoEdicion: string;
}

export interface AmonestacionPagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AmonFotoDto {
  id: number;
  url: string;
  nombreArchivo?: string;
  orden: number;
  base64Data?: string;
}

export interface AmonestacionDetalleDto {
  id: number;
  codigo: string;
  proyectoId: number;
  proyectoNombre: string;
  fecha: string;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  workerCategoria?: string;
  workerCargo?: string;
  workerEdad?: number;
  empresaNombre: string;
  esEmpresaAbril: boolean;
  empresaLogoUrl?: string;
  partidaId?: number;
  partidaNombre?: string;
  tipoSancionId: number;
  tipoSancionNombre: string;
  nivelGravedad: string;
  generaSuspension: boolean;
  infraccionTipoId: number;
  infraccionTipoNombre: string;
  descripcion: string;
  aplicaPenalizacion: boolean;
  sancionInfraccionId?: number;
  sancionInfraccionNombre?: string;
  montoCalculado: number;
  puntosInfraccion: number;
  puntosAcumulados: number;
  inhabilitado: boolean;
  diasSuspension?: number;
  fechaInicioSuspension?: string;
  fechaFinSuspension?: string;
  personaReportaNombre?: string;
  pdfUrl?: string;
  estado: string;
  documentoFirmadoUrl?: string;
  fechaCierre?: string;
  createdAt: string;
  fotos: AmonFotoDto[];
}

export interface AmonestacionCerrarRequest {
  documentoFirmadoBase64: string;
  nombreArchivo: string;
}

export interface AmonPorTipoDto {
  tipoNombre: string;
  total: number;
}

export interface AmonCeldaTipoDto {
  tipoNombre: string;
  total: number;
}

export interface AmonMatrizProyectoDto {
  proyectoNombre: string;
  total: number;
  porTipo: AmonCeldaTipoDto[];
}

export interface AmonTendenciaMesDto {
  mes: number;
  total: number;
  porTipo: AmonCeldaTipoDto[];
  porProyecto: AmonCeldaTipoDto[];
}

export interface AmonUltimoSancionadoDto {
  id: number;
  codigo: string;
  workerNombre: string;
  workerDni: string;
  empresaNombre: string;
  proyectoNombre: string;
  tipoSancionNombre: string;
  nivelGravedad: string;
  puntosInfraccion: number;
  fecha: string;
  estado: string;
}

export interface AmonestacionDashboardDto {
  totalAmonestaciones: number;
  trabajadoresConMas5Puntos: number;
  trabajadoresInhabilitados: number;
  amonestacionesMesActual: number;
  borradorPendientes: number;
  pendientesCierre: number;
  amonestacionesRegistradas: number;
  amonestacionesCerradas: number;
  porTipoSancion: AmonPorTipoDto[];
  matrizProyecto: AmonMatrizProyectoDto[];
  tendenciaMeses: AmonTendenciaMesDto[];
  ultimosSancionados: AmonUltimoSancionadoDto[];
}

export interface WorkerPuntajeDto {
  workerId: number;
  nombre: string;
  dni: string;
  empresaNombre: string;
  puntosAcumulados: number;
  inhabilitado: boolean;
  historial: AmonestacionListItemDto[];
}
