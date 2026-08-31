import { EvEvaluacionResponseDto } from './ev-evaluacion.model';

export interface EvAreaPromedioDto {
  areaNombre: string;
  promedio: number | null;
  totalEvaluaciones: number;
}

export interface EvTendenciaDto {
  mes: number;
  anio: number;
  nombreMes: string;
  userId: number;
  nombre: string;
  promedio: number | null;
}

export interface EvResidenteResumenDto {
  userId: number;
  nombre: string;
  projectId: number | null;
  projectNombre: string | null;
  promedioGeneral: number | null;
  promedioMesAnterior: number | null;
  promediosPorArea: EvAreaPromedioDto[];
  evaluaciones: EvEvaluacionResponseDto[];
}

export interface EvPendienteDto {
  userId: number;
  nombre: string;
  email: string;
  areasCompletadas: string[];
  areasPendientes: string[];
}

export interface EvDashboardGerenciaDto {
  promedioGeneral: number | null;
  totalResidentes: number;
  evaluacionesCompletadas: number;
  evaluacionesEsperadas: number;
  bajoRendimiento: number;
  residentes: EvResidenteResumenDto[];
  promediosPorArea: EvAreaPromedioDto[];
  ultimosComentarios: EvEvaluacionResponseDto[];
  tendencia: EvTendenciaDto[];
}
