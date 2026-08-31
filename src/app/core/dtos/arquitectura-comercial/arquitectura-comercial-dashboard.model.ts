export interface ArqComercialKpiDTO {
  totalActividades: number;
  culminadas: number;
  enProceso: number;
  vencidas: number;
  pendientes: number;
  eficienciaMedia: number;
  progresoGlobal: number;
}

export interface ArqComercialAlertDTO {
  vencidasSinCerrar: number;
  vencenEstaSemana: number;
  arrancanEstaSemana: number;
  hitosProximos14Dias: number;
}

export interface ChartItemDTO {
  label: string;
  value: number;
}

export interface ProyeccionAvanceDTO {
  labels: string[];
  programado: number[];
  real: number[];
}

export interface EficienciaSemanalDTO {
  semana: string;
  valor: number;
}

export interface SupervisorProgresoDTO {
  userId: number;
  nombre: string;
  progreso: number;
  total: number;
  completadas: number;
  /** Actividades vencidas de semanas anteriores que el supervisor aún arrastra sin cerrar.
   * Informativo — ya no penaliza el IES (que ahora solo mide la semana en control). */
  deudaAnterior: number;
  /** true si no tenía nada que vencer ni arrancar esta semana — no entra al IES ni al promedio. */
  sinCompromisos: boolean;
  /** Componente SPI del IES (35%): ritmo real vs. planificado de lo que debía cerrar. */
  compSpi: number;
  /** Componente tasa de cierre del IES (35%): % de lo que debía cerrar esta semana y cerró. */
  compCierre: number;
  /** Componente puntualidad de inicio del IES (20%): % de lo que debía arrancar y arrancó a tiempo. */
  compInicio: number;
  /** Motivos concretos por los que el IES no llegó a 100%. */
  motivos: string[];
}

export interface SupervisorHistoricoDTO {
  nombre: string;
  totalActividades: number;
  culminadas: number;
  enProceso: number;
  vencidas: number;
  pendientes: number;
  eficienciaHistorica: number;
  spiPromedio: number;
  tendenciaSemanal: EficienciaSemanalDTO[];
}

export interface HitoCriticoDTO {
  id: number;
  nombre: string;
  proyecto: string;
  fechaLimite: string;
  diasRestantes: number;
  estado: string;
  semana: number;
}

export interface SemanaDashboardDTO {
  numero: number;
  label: string;
  inicio: string;
  fin: string;
}

export interface CategoriaDashboardItemDTO {
  id: number;
  nombre: string;
  total: number;
  culminadas: number;
  enProceso: number;
  vencidas: number;
  pendientes: number;
  progreso: number;
}

export interface ArqComercialDashboardDTO {
  kpis: ArqComercialKpiDTO;
  alertas: ArqComercialAlertDTO;
  proyeccionAvance: ProyeccionAvanceDTO;
  rankingEficiencia: ChartItemDTO[];
  distribucionEstado: ChartItemDTO[];
  tendenciaEficiencia: EficienciaSemanalDTO[];
  supervisores: SupervisorProgresoDTO[];
  hitosCriticos: HitoCriticoDTO[];
  tareasPorArquitectoDetalle  : TareasPorArquitectoDTO[];
  avanceSemanal               : AvanceSemanalDTO[];
  eficienciaSpi               : EficienciaSpiDTO[];
  categorias                  : CategoriaItemDTO[];
  distribucionPorCategoria    : CategoriaDashboardItemDTO[];
  distribucionTipos           : ChartItemDTO[];
  semanaActual                : SemanaDashboardDTO;
  rangoUltimasSemanas         : string;
}

export interface TareasPorArquitectoDTO {
  userId      : number;
  nombre      : string;
  hitos       : number;
  entregables : number;
  consultas   : number;
  total       : number;
  avancePct   : number;
}

export interface AvanceSemanalDTO {
  semana     : string;
  programado : number;
  real       : number;
}

export interface EficienciaSpiDTO {
  semana  : string;
  spi     : number;
  esperado: number;
}

export interface CategoriaItemDTO {
  id    : number;
  nombre: string;
}

export interface ArqComercialFiltersDTO {
  semanas: { value: string; label: string }[];
  meses: { value: string; label: string }[];
  proyectos: { id: number; nombre: string }[];
}

export interface ArqComercialSelectedFilters {
  semana: string | null;
  mes: string | null;
  proyectoId: number;
}
