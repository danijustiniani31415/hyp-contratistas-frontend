// ─── Cargas S10 ──────────────────────────────────────────────────────────────

export interface ImportConsumoResultDto {
  cargaId: number;
  nombreArchivo: string;
  totalLineas: number;
  lineasNuevas: number;
  lineasActualizadas: number;
  lineasEliminadas: number;
  lineasSinCambio: number;
  lineasEstandarizadas: number;
  lineasAutoRechazadas: number;
  lineasPendientes: number;
  lineasSinMatch: number;
  estado: string;
  advertencias: string[];
}

export interface ConsumoCargaResumenDto {
  id: number;
  projectId: number;
  nombreArchivo: string;
  fechaMin: string;
  fechaMax: string;
  totalLineas: number;
  lineasNuevas: number;
  lineasActualizadas: number;
  lineasEliminadas: number;
  lineasEstandarizadas: number;
  lineasPendientes: number;
  estado: string;
  creadoEn: string;
  porcentajeEstandarizado: number;
}

// ─── Cargas de Horas Hombre (planilla/Tareo semanal) ──────────────────────────

export interface ImportHhResultDto {
  cargaId: number;
  nombreArchivo: string;
  totalLineas: number;
  lineasNuevas: number;
  lineasActualizadas: number;
  lineasEliminadas: number;
  lineasSinCambio: number;
  horasLaboradasTotales: number;
  estado: string;
  advertencias: string[];
}

export interface HhCargaResumenDto {
  id: number;
  projectId: number;
  nombreArchivo: string;
  anioMin: number;
  semanaMin: number;
  anioMax: number;
  semanaMax: number;
  totalLineas: number;
  lineasNuevas: number;
  lineasActualizadas: number;
  lineasEliminadas: number;
  estado: string;
  creadoEn: string;
}

// ─── Revisión de materiales ───────────────────────────────────────────────────

export interface MaterialPendienteDto {
  lineaId: number;
  recursoCrudo: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  fechaGuia: string;
  nombreItemSugerido?: string;
  nombreFamiliaSugerida?: string;
  scoreMatch?: number;
  metodoMatch?: string;
  estadoRevision?: string;
  itemIdSugerido?: number;
}

export interface RevisionDecisionDto {
  lineaId: number;
  decision: 'AUTORIZADO' | 'RECHAZADO';
  itemIdConfirmado?: number;
  motivoRechazo?: string;
}

export interface RevisionResultDto {
  autorizados: number;
  rechazados: number;
  notificacionesEnviadas: number;
  errores: string[];
}

export interface CrearItemCatalogoDto {
  nombre: string;
  familiaId: number;
}

export interface CrearFamiliaCatalogoDto {
  nombre: string;
  tipoId: number;
  variableBase: string;
  unidadMedida?: string | null;
  perteneceSsoma: boolean;
}

export interface BuscarItemDto {
  id: number;
  nombre: string;
  nombreFamilia: string;
  tipoMaterial: string;
  perteneceSsoma: boolean;
}

// ─── Drivers / Ratios ─────────────────────────────────────────────────────────

export interface DriverProyectoDto {
  projectId: number;
  projectDescription: string;
  estado: string;
  hhTotalCasa: number | null;
  areaTechadaM2: number | null;
  trabajadores: number | null;
  hhFuente: string;
  familiasConRatio: number;
  tieneConsumos: boolean;
  habilitadoSsoma: boolean;
}

export interface ActualizarDriversDto {
  hhTotalCasa: number;
  areaTechadaM2: number;
  trabajadores: number;
  hhFuente: string;
  recalcularRatios: boolean;
}

export interface ActualizarDriversResultDto {
  projectId: number;
  ratiosCalculados: number;
  outliersMarcados: number;
}

export interface FamiliaConRatioDto {
  familiaId: number;
  nombreFamilia: string;
  tipoMaterial: string;
  variableBase: string;
  nProyectos: number;
  nOutliers: number;
}

export interface RatioProyectoItemDto {
  projectId: number;
  projectDescription: string;
  ratioCantidad: number;
  precioUnitario: number;
  cantidadTotal: number;
  valorDriver: number;
  esOutlier: boolean;
  incluidoManualRatio: boolean;
  incluidoManualPrecio: boolean;
}

export interface RatioFamiliaComparacionDto {
  familiaId: number;
  nombreFamilia: string;
  tipoMaterial: string;
  variableBase: string;
  proyectos: RatioProyectoItemDto[];
  promedioRatio: number;
  medianaRatio: number;
  minRatio: number;
  maxRatio: number;
  promedioPrecioUnitario: number;
}

export interface CalcularRatiosResultDto {
  projectId: number;
  projectDescription: string;
  ratiosCalculados: number;
  familiasSinDriver: number;
  advertencias: string[];
}

export interface CalcularRatiosTodosResultDto {
  totalProyectosProcesados: number;
  proyectos: CalcularRatiosResultDto[];
}

export interface RatioProyectoDto {
  id: number;
  familiaId: number;
  nombreFamilia: string;
  tipoMaterial: string;
  projectId: number;
  projectDescription: string;
  variableBase: string;
  cantidadTotal: number;
  precioUnitarioPromedio: number;
  valorDriver: number;
  ratioCantidad: number;
  esOutlier: boolean;
  incluidoManualRatio: boolean;
  incluidoManualPrecio: boolean;
}

export interface ResumenProyectoRatioDto {
  projectId: number;
  projectDescription: string;
  familiasCalculadas: number;
  totalGastoSsoma: number;
  fechaMin: string | null;
  fechaMax: string | null;
}

export interface ResumenRatiosDto {
  proyectos: ResumenProyectoRatioDto[];
  totalFamilias: number;
}

// ─── Ratios de drivers de proyecto (HH y N Trabajadores por m2) ──────────────
// Analogo a los ratios de materiales, pero sobre los drivers del proyecto mismo
// (no consumos). No segmenta por tipo de proyecto; incluidoManual es la unica
// autoridad real sobre que proyecto entra al calculo, "esOutlier" es solo informativo.

export type TipoDriverRatio = 'HH' | 'TRABAJADORES';

export interface RatioDriverProyectoDto {
  projectId: number;
  projectDescription: string;
  /** Finalizado | Activo | Inactivo — si sigue Activo, el HH/dotación es parcial (Tareo a la fecha). */
  cicloVida: string;
  diasRegistrados: number;
  areaTechada: number;
  cantidad: number;
  ratio: number;
  esOutlier: boolean;
  incluidoManual: boolean;
}

export interface RatioDriverComparacionDto {
  tipoDriver: TipoDriverRatio;
  proyectos: RatioDriverProyectoDto[];
  medianaRatio: number;
  promedioRatio: number;
  minRatio: number;
  maxRatio: number;
}

export interface CalcularRatiosDriversResultDto {
  ratiosCalculados: number;
  proyectosSinArea: number;
  proyectosSinTareo: number;
}

export interface RatioDriverRecomendadoDto {
  tipoDriver: TipoDriverRatio;
  ratioRecomendado: number;
  nProyectos: number;
}

export interface RatiosDriversRecomendadosDto {
  hh: RatioDriverRecomendadoDto | null;
  trabajadores: RatioDriverRecomendadoDto | null;
}

// ─── Presupuesto ──────────────────────────────────────────────────────────────

export interface GenerarPresupuestoDto {
  hhTotalCasa?: number;
  areaTechadaM2?: number;
  trabajadores?: number;
  notas?: string;
}

export interface ActualizarLineaPresupuestoDto {
  cantidadManual?: number | null;
  precioManual?: number | null;
  notasLinea?: string | null;
}

export interface PresupuestoResumenDto {
  id: number;
  projectId: number;
  projectDescription: string;
  version: number;
  estado: string;
  hhUsado: number;
  areaUsada: number;
  trabajadoresUsados: number;
  totalEstimado: number;
  totalFamilias: number;
  familiasSinHistoria: number;
  generadoEn: string;
}

export interface PresupuestoLineaDto {
  lineaId: number;
  familiaId: number;
  nombreFamilia: string;
  tipoId: number;
  nombreTipo: string;
  variableBase: string;
  ratioRecomendado: number;
  nProyectosBase: number;
  valorDriver: number;
  cantidadEstimada: number;
  precioUnitario: number;
  totalEstimado: number;
  tieneHistoria: boolean;
  cantidadManual: number | null;
  precioManual: number | null;
  notasLinea: string | null;
  cantidadEfectiva: number;
  precioEfectivo: number;
  totalEfectivo: number;
}

export interface PresupuestoTipoDto {
  tipoId: number;
  nombreTipo: string;
  totalEstimado: number;
  familias: PresupuestoLineaDto[];
}

export interface PresupuestoDetalleDto extends PresupuestoResumenDto {
  notas: string | null;
  tipos: PresupuestoTipoDto[];
}

// ─── Control semanal ──────────────────────────────────────────────────────────

export interface AbrirSemanaDto {
  presupuestoId: number;
  fechaInicio: string;
  fechaFin: string;
  observaciones?: string;
}

export interface RegistrarConsumoLineaDto {
  familiaId: number;
  cantidadReal: number;
  precioUnitario?: number | null;
  notas?: string | null;
}

export interface ControlSemanaLineaDto {
  id: number;
  familiaId: number;
  nombreFamilia: string;
  nombreTipo: string;
  cantidadReal: number;
  precioUnitario: number | null;
  totalReal: number;
  notas: string | null;
}

export interface ControlSemanaDto {
  id: number;
  presupuestoId: number;
  projectId: number;
  projectDescription: string;
  semanaNum: number;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  observaciones: string | null;
  registradoEn: string;
  lineas: ControlSemanaLineaDto[];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type Semaforo = 'OK' | 'ADVERTENCIA' | 'ALERTA' | 'SIN_PRESUPUESTO';

export interface DashboardLineaDto {
  familiaId: number;
  nombreFamilia: string;
  tipoId: number;
  variableBase: string;
  cantidadPresupuestada: number;
  cantidadConsumida: number;
  cantidadSaldo: number;
  precioUnitario: number;
  totalPresupuestado: number;
  totalConsumido: number;
  totalSaldo: number;
  pctConsumido: number;
  semaforo: Semaforo;
}

export interface DashboardTipoDto {
  tipoId: number;
  nombreTipo: string;
  totalPresupuestado: number;
  totalConsumido: number;
  totalSaldo: number;
  pctConsumido: number;
  familias: DashboardLineaDto[];
}

export interface DashboardPresupuestoDto {
  presupuestoId: number;
  projectId: number;
  projectDescription: string;
  version: number;
  totalPresupuestado: number;
  totalConsumido: number;
  totalSaldo: number;
  pctConsumido: number;
  semanasRegistradas: number;
  familiasEnAlerta: number;
  familiasEnAdvertencia: number;
  tipos: DashboardTipoDto[];
}

// ─── Dotación de personal SSOMA por hito crítico ──────────────────────────────

export interface HitoCriticoDisponibleDto {
  hitoId: number;
  hitoDescripcion: string;
  hitoFecha: string | null;
}

export interface PersonalHitoDto {
  id: number;
  hitoId: number;
  hitoDescripcion: string;
  hitoFecha: string | null;
  esHitoCritico: boolean;
  rol: string;
  cantidad: number;
  semanas: number;
  costoMensual: number;
  total: number;
}

export interface PersonalHitoItemInputDto {
  hitoId: number;
  rol: string;
  cantidad: number;
  semanas: number;
  costoMensual: number;
}

export interface PersonalHitoGuardarDto {
  items: PersonalHitoItemInputDto[];
}

// ─── Kits / BOM (Botiquín, Estación de Emergencia, etc.) ──────────────────────

export interface KitResumenDto {
  id: number;
  nombre: string;
  tipoId: number;
  nombreTipo: string;
}

export interface KitItemDto {
  id: number;
  familiaId: number;
  nombreFamilia: string;
  cantidadPorKit: number;
  esConsumible: boolean;
}

export interface KitDetalleDto {
  id: number;
  nombre: string;
  tipoId: number;
  nombreTipo: string;
  items: KitItemDto[];
}

export interface KitCalculoLineaDto {
  familiaId: number;
  nombreFamilia: string;
  cantidadPorKit: number;
  cantidadTotal: number;
  esConsumible: boolean;
}

export interface KitItemInputDto {
  familiaId: number;
  cantidadPorKit: number;
  esConsumible: boolean;
}

export interface KitCreateDto {
  nombre: string;
  tipoId: number;
  items: KitItemInputDto[];
}

// ─── Catálogo de Materiales (3 secciones) ─────────────────────────────────────

export interface TipoMaterialDto {
  id: number;
  nombre: string;
}

export interface FamiliaCatalogoDto {
  id: number;
  nombre: string;
  tipoId: number;
  nombreTipo: string;
  variableBase: string;
  unidadMedida?: string | null;
  perteneceSsoma: boolean;
  activo: boolean;
}

export interface ActualizarFamiliaDto {
  nombre: string;
  tipoId: number;
  variableBase: string;
  unidadMedida?: string | null;
  perteneceSsoma: boolean;
  activo: boolean;
}

export interface MaterialPendienteGlobalDto {
  lineaId: number;
  projectId: number;
  projectDescription: string;
  recursoCrudo: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  fechaGuia: string;
  nombreItemSugerido?: string;
  nombreFamiliaSugerida?: string;
  itemIdSugerido?: number;
  scoreMatch?: number;
  metodoMatch?: string;
}

export interface MaterialNoSsomaDto {
  lineaId: number;
  projectId: number;
  projectDescription: string;
  recursoCrudo: string;
  precioTotal: number;
  fechaGuia: string;
  estadoRevision?: string;
}
