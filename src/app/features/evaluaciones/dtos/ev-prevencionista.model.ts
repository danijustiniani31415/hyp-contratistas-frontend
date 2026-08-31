import type { EvPeriodoDto } from './ev-periodo.model';
export type { EvPeriodoDto } from './ev-periodo.model';
import type { EvSupervisorContratistaCriterioDto } from './ev-supervisor-contratista.model';
export type { EvSupervisorContratistaCriterioDto } from './ev-supervisor-contratista.model';

// ─── CREATE (lo envía un usuario contratista logueado) ─────────────────────
export interface EvPrevencionistaEvaluacionCreateDto {
  evaluadoUserId: number;
  proyectoId: number;
  comentario: string | null;
  detalles: EvPrevencionistaDetalleCreateDto[];
}

export interface EvPrevencionistaDetalleCreateDto {
  plantillaId: number | null;
  criterio: string;
  puntaje: number;
}

// ─── INICIO (pantalla evaluar, dentro del portal contratista) ──────────────
export interface EvPrevencionistaInicioDto {
  periodo: EvPeriodoDto | null;
  plantillaCoordinador: EvSupervisorContratistaCriterioDto[];
  plantillaPrevencionista: EvSupervisorContratistaCriterioDto[];
  aEvaluar: EvPrevencionistaAEvaluarDto[];
}

export interface EvPrevencionistaAEvaluarDto {
  evaluadoUserId: number;
  evaluadoNombre: string;
  evaluadoPuesto: string;
  proyectoId: number;
  proyectoNombre: string;
  yaEvalue: boolean;
}

// ─── MI PERFIL (el propio prevencionista/coordinador — sin identidad del evaluador) ─
export interface EvPrevencionistaMiPerfilDto {
  promedioGeneral: number | null;
  totalEvaluaciones: number;
  comentarios: string[];
}

// ─── DASHBOARD (solo Jefe SSOMA — con identidad del contratista evaluador) ─
export interface EvPrevencionistaDashboardDto {
  totalEvaluaciones: number;
  promedioGeneral: number | null;
  evaluaciones: EvPrevencionistaResumenDto[];
}

export interface EvPrevencionistaResumenDto {
  evaluacionId: number;
  evaluadoUserId: number;
  evaluadoNombre: string;
  proyectoId: number;
  proyectoNombre: string;
  evaluadorContributorNombre: string;
  nota: number | null;
  comentario: string | null;
  createdAt: string;
}
