// Dashboard
export interface PasoDashboardDto {
  anioActual: number;
  totalProgramas: number;
  programasActivos: number;
  spiConsolidado: number;
  spiColor: 'verde' | 'amarillo' | 'rojo';
  porcentajeAvanceConsolidado: number;
  totalVencidas: number;
  totalProximasVencer: number;
  porProyecto: PasoPorProyectoDto[];
  seguridad?: SpiPorAmbitoDto;
  salud?: SpiPorAmbitoDto;
  ambiente?: SpiPorAmbitoDto;
}

export interface PasoPorProyectoDto {
  proyectoId: number;
  proyectoNombre: string;
  pasoId: number;
  spi: number;
  spiColor: 'verde' | 'amarillo' | 'rojo';
  porcentajeAvance: number;
  vencidas: number;
}

// Alertas
export interface PasoAlertaDto {
  ejecucionId: number;
  actividadId: number;
  actividadNombre: string;
  pasoId: number;
  pasoNombre: string;
  proyectoNombre: string | null;
  fechaProgramada: string;
  tipoAlerta: 'Vencido' | 'ProximaAVencer';
  responsableNombre: string | null;
}

// SPI
export interface PasoSpiDto {
  spiGeneral: number;
  spiColor: 'verde' | 'amarillo' | 'rojo';
  porcentajeAvance: number;
  planificadasAHoy: number;
  ejecutadasAHoy: number;
  totalProgramadas: number;
  totalEjecutadas: number;
  totalVencidas: number;
  proximasAVencer: number;
  seguridad: SpiPorAmbitoDto;
  salud: SpiPorAmbitoDto;
  ambiente: SpiPorAmbitoDto;
  ssoma?: SpiPorAmbitoDto;
}

export interface SpiPorAmbitoDto {
  spi: number;
  color: 'verde' | 'amarillo' | 'rojo';
  planificadas: number;
  ejecutadas: number;
  vencidas: number;
}

// Lista (paginada)
export interface PasoListItemDto {
  id: number;
  proyectoId: number | null;
  proyectoNombre: string | null;
  plantillaId: number | null;
  nombre: string;
  anio: number;
  mesInicio: number;
  esPlantilla: boolean;
  estado: 'Borrador' | 'Aprobado' | 'Activo' | 'Cerrado';
  aprobadoPorNombre: string | null;
  aprobadoEn: string | null;
  createdAt: string;
  totalActividades: number;
  totalPlanificadas: number;
  totalEjecutadas: number;
  totalVencidas: number;
  spi: number;
  porcentajeAvance: number;
}

export interface PagedResultDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Detalle
export interface PasoDetalleDto extends PasoListItemDto {
  actividades: PasoActividadDto[];
}

// Actividad
export interface PasoActividadDto {
  id: number;
  pasoId: number;
  categoriaId: number;
  categoriaNombre: string;
  categoriaAmbito: 'Seguridad' | 'Salud' | 'Ambiente';
  categoriaIcono?: string;
  nombre: string;
  descripcion: string | null;
  alcance: string | null;
  frecuencia: 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual' | 'Unica';
  responsableId: number | null;
  responsableNombre: string | null;
  responsableTexto: string | null;
  mesInicio: number;
  mesFin: number;
  cantidadPlanificada: number;
  horas: number | null;
  recursos: string | null;
  indicador: string;
  meta: string;
  orden: number | null;
  activo: boolean;
  ejecucionesTotal: number;
  ejecucionesCompletadas: number;
  ejecucionesVencidas: number;
  spi: number;
  ejecuciones: PasoEjecucionDto[];
}

// Archivo de ejecución
export interface PasoEjecucionArchivoDto {
  id: number;
  ejecucionId: number;
  archivoUrl: string;
  archivoNombre: string;
  archivoSpId: string | null;
  orden: number;
  createdAt: string;
}

// Ejecución
export interface PasoEjecucionDto {
  id: number;
  actividadId: number;
  fechaProgramada: string;
  fechaVerificacion: string | null;
  fechaEjecutada: string | null;
  fechaReprogramada: string | null;
  motivoReprogramacion: string | null;
  estado: 'Programado' | 'Ejecutado' | 'Vencido' | 'Cancelado' | 'Reprogramado';
  observaciones: string | null;
  participantesCount: number | null;
  evidenciaNombre: string | null;
  evidenciaUrl: string | null;
  evidenciaSpId: string | null;
  registradoPorNombre: string | null;
  createdAt: string;
  archivos: PasoEjecucionArchivoDto[];
}

// Gantt
export interface GanttItemDto {
  id: number;
  nombre: string;
  ambito: string;
  frecuencia: string;
  mesInicio: number;
  mesFin: number;
  responsableNombre: string | null;
  meses: GanttMesDto[];
}

export interface GanttMesDto {
  mes: number;
  planificado: boolean;
  estado: string;
  ejecucionId: number | null;
}

// Categoría
export interface PasoCategoriaDto {
  id: number;
  nombre: string;
  ambito: 'Seguridad' | 'Salud' | 'Ambiente';
  icono: string | null;
  activo: boolean;
}

// PASO Salud (lista consolidada, todos los proyectos)
export interface PasoSaludActividadListItemDto {
  ejecucionId: number;
  actividadId: number;
  pasoId: number;
  proyectoId: number | null;
  proyectoNombre: string;
  categoriaId: number;
  categoriaNombre: string;
  categoriaIcono: string | null;
  actividadNombre: string;
  frecuencia: string;
  fechaProgramada: string;
  fechaEjecutada: string | null;
  estado: string;
  cumplida: boolean;
  observaciones: string | null;
  participantesCount: number | null;
  evidenciaUrl: string | null;
  evidenciaNombre: string | null;
  responsableNombre: string | null;
}

export interface PasoSaludListQuery {
  proyectoId?: number;
  categoriaId?: number;
  anio?: number;
  mes?: number;
  cumplida?: boolean;
  page?: number;
  pageSize?: number;
}

// Requests
export interface CreatePasoDto {
  proyectoId?: number;
  nombre: string;
  anio: number;
  mesInicio?: number;
  esPlantilla: boolean;
}

export interface InstanciarPasoDto {
  proyectoId: number;
  nombre: string;
  anio: number;
  mesInicio?: number;
}

export interface CreateActividadDto {
  pasoId: number;
  categoriaId: number;
  nombre: string;
  descripcion?: string;
  alcance?: string;
  frecuencia: string;
  responsableId?: number;
  responsableTexto?: string;
  mesInicio: number;
  mesFin: number;
  cantidadPlanificada: number;
  horas?: number;
  recursos?: string;
  indicador?: string;
  meta?: string;
  orden?: number;
}

export interface CreateEjecucionDto {
  actividadId: number;
  fechaProgramada?: string;
  fechaEjecutada?: string;
  fechaVerificacion?: string;
  observaciones?: string;
  participantesCount?: number;
}

export interface PasoResumenMesDto {
  anio: number;
  mes: number;
  nombreMes: string;
  totalProgramadas: number;
  completadas: number;
  pendientes: number;
  vencidas: number;
  porcentajeAvance: number;
  seguridad: PasoResumenMesAmbitoDto;
  salud: PasoResumenMesAmbitoDto;
  ambiente: PasoResumenMesAmbitoDto;
  ssoma: PasoResumenMesAmbitoDto;
  actividades: PasoResumenMesActividadDto[];
}

export interface PasoAuditoriaDto {
  id: number;
  tipo: string;
  descripcion: string;
  motivo: string;
  valorAnterior: any;
  valorNuevo: any;
  usuarioId: number | null;
  createdAt: string;
}

export interface PasoResumenMesAmbitoDto {
  programadas: number;
  completadas: number;
  pendientes: number;
  vencidas: number;
}

export interface PasoHistoricoAnioDto {
  anio: number;
  totalProgramadas: number;
  totalEjecutadas: number;
  totalVencidas: number;
  spiGeneral: number;
  spiColor: 'verde' | 'amarillo' | 'rojo';
  porcentajeAvance: number;
}

export interface PasoResumenMesActividadDto {
  actividadId: number;
  nombre: string;
  categoriaNombre: string;
  categoriaAmbito: string;
  frecuencia: string;
  ejecucionId: number | null;
  fechaProgramada: string | null;
  estado: 'Ejecutado' | 'Programado' | 'Vencido' | 'SinProgramar';
  fechaEjecutada: string | null;
  observaciones: string | null;
  evidenciaNombre: string | null;
  evidenciaUrl: string | null;
  archivos: PasoEjecucionArchivoDto[];
}
