import type { EvPeriodoDto } from './ev-periodo.model';
export type { EvPeriodoDto } from './ev-periodo.model';

// ─── INICIO (pantalla evaluar) ─────────────────────────────────────────────
export interface EvContratistaInicioDto {
  periodo: EvPeriodoDto | null;
  miAreaNombre: string | null;
  miPuestoEvaluador: string | null;
  plantilla: EvContratistaCriterioDto[];
  contratistasAEvaluar: EvContratistaAEvaluarDto[];
  puedeVerTodos: boolean;
  yaMarcoNoAplica: boolean;
}

export interface EvContratistaCriterioDto {
  id: number;
  criterio: string;
  orden: number;
}

export interface EvContratistaAEvaluarDto {
  contributorId: number;
  contributorNombre: string;
  contributorRuc: string;
  proyectoId: number;
  proyectoNombre: string;
  diasLaborados: number;
  yaEvalue: boolean;
  notaPrevia: number | null;
  noAplica: boolean;
  noAplicaMotivo: string | null;
}

// ─── CREATE ───────────────────────────────────────────────────────────────
export interface EvContratistaEvaluacionCreateDto {
  proyectoId: number;
  contributorId: number;
  comentario: string | null;
  detalles: EvContratistaDetalleCreateDto[];
}

export interface EvContratistaDetalleCreateDto {
  plantillaId: number | null;
  criterio: string;
  puntaje: number | null;
  esNa: boolean;
}

// ─── VER EVALUACIONES ─────────────────────────────────────────────────────
export interface EvContratistaVerInicioDto {
  periodos: EvPeriodoDto[];
  proyectos: EvContratistaProyectoFiltroDto[];
  evaluaciones: EvContratistaResumenDto[];
}

export interface EvContratistaProyectoFiltroDto {
  proyectoId: number;
  proyectoNombre: string;
}

export interface EvContratistaResumenDto {
  contributorId: number;
  contributorNombre: string;
  contributorRuc: string;
  proyectoId: number;
  proyectoNombre: string;
  notaOT: number | null;
  notaSsoma: number | null;
  notaResidencia: number | null;
  notaCalidad: number | null;
  notaProduccion: number | null;
  notaAdministracion: number | null;
  notaTotal: number | null;
  estado: 'Aprobado' | 'Regular' | 'Desaprobado' | 'Sin evaluar';
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
export interface EvContratistaDashboardDto {
  totalContratistas: number;
  aprobados: number;
  regulares: number;
  desaprobados: number;
  promedioGeneral: number | null;
  contratistas: EvContratistaResumenDto[];
  promediosPorArea: EvContratistaAreaPromedioDto[];
  tendencia: EvContratistaTendenciaDto[];
}

export interface EvContratistaAreaPromedioDto {
  areaNombre: string;
  promedio: number | null;
  totalEvaluaciones: number;
}

export interface EvContratistaTendenciaDto {
  mes: number;
  anio: number;
  nombreMes: string;
  contributorId: number;
  contributorNombre: string;
  notaTotal: number | null;
}

// ─── ENVÍO DE RESULTADOS A GERENTES ────────────────────────────────────────
export interface EvContratistaEnvioResultadoDto {
  enviados: number;
  omitidosSinEmail: string[];
}
