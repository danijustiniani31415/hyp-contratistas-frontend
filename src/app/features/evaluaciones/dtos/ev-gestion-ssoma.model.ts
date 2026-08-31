import type { EvPeriodoDto } from './ev-periodo.model';
export type { EvPeriodoDto } from './ev-periodo.model';
import type { EvSupervisorContratistaCriterioDto } from './ev-supervisor-contratista.model';
export type { EvSupervisorContratistaCriterioDto } from './ev-supervisor-contratista.model';

// ─── INICIO (pantalla evaluar) ──────────────────────────────────────────────
// D1/D2 (Jefe SSOMA): prevencionistas + coordinadores vienen poblados.
// D3 (Coordinador SSOMA): solo prevencionistas.
// D4 (Prevencionista, anónima): miCoordinador viene poblado, las listas no.
export interface EvGestionSsomaInicioDto {
  periodo: EvPeriodoDto | null;
  plantillaCoordinador: EvSupervisorContratistaCriterioDto[];
  plantillaPrevencionista: EvSupervisorContratistaCriterioDto[];
  prevencionistas: EvGestionSsomaAEvaluarDto[];
  coordinadores: EvGestionSsomaAEvaluarDto[];
  miCoordinador: EvGestionSsomaAEvaluarDto | null;
  yaEvalueMiCoordinador: boolean;
}

export interface EvGestionSsomaAEvaluarDto {
  userId: number;
  nombreCompleto: string;
  proyectoId: number | null;
  proyectoNombre: string | null;
  yaEvalue: boolean;
  notaPrevia: number | null;
}

// ─── CREATE ──────────────────────────────────────────────────────────────────
export interface EvGestionSsomaEvaluacionCreateDto {
  // null cuando el evaluador es Prevencionista: el servidor resuelve solo a
  // quién corresponde (su Coordinador SSOMA), así la evaluación queda anónima
  // también del lado del request.
  evaluadoUserId: number | null;
  fortalezas: string | null;
  oportunidadesMejora: string | null;
  detalles: EvGestionSsomaDetalleCreateDto[];
}

export interface EvGestionSsomaDetalleCreateDto {
  plantillaId: number | null;
  criterio: string;
  puntaje: number;
}

// ─── RESULTADOS (Jefe SSOMA) ─────────────────────────────────────────────────
export interface EvGestionSsomaResultadosDto {
  periodo: EvPeriodoDto | null;
  totalRespuestas: number;
  promedioGeneral: number | null;
  promediosPorCriterio: EvGestionSsomaCriterioPromedioDto[];
  evaluaciones: EvGestionSsomaResumenDto[];
}

export interface EvGestionSsomaCriterioPromedioDto {
  criterio: string;
  promedio: number;
}

export interface EvGestionSsomaResumenDto {
  relacion: string; // "D1" | "D2" | "D3" | "D4" | "D5"
  evaluadoNombre: string;
  evaluadorNombre: string | null; // null en D4 (anónima)
  nota: number | null;
  fortalezas: string | null;
  oportunidadesMejora: string | null;
  createdAt: string;
}

export interface EvGestionSsomaCumplimientoDto {
  totalEsperadas: number;
  totalCompletadas: number;
  pendientes: EvGestionSsomaPendienteDto[];
}

export interface EvGestionSsomaPendienteDto {
  userId: number;
  nombreCompleto: string;
  emailCorporativo: string;
  relacion: string;
}
