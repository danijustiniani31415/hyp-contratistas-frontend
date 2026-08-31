// ── Avance por zona/nivel/sector ────────────────────────────────────────

export interface CeldaAvanceDto {
  nivelId: number;
  nivelNombre: string;
  sectorId: number;
  sectorNombre: string;
  totalRegistros: number;
  cumplidosRegistros: number;
  porcentajeAvance: number;
}

export interface ZonaAvanceDto {
  zonaId: number;
  zonaNombre: string;
  totalRegistros: number;
  cumplidosRegistros: number;
  porcentajeAvance: number;
  celdas: CeldaAvanceDto[];
}

export interface AvanceProyectoDto {
  desde: string | null;
  hasta: string | null;
  totalRegistros: number;
  cumplidosRegistros: number;
  porcentajeAvance: number;
  zonas: ZonaAvanceDto[];
}

// ── PPC histórico ────────────────────────────────────────────────────────

export interface PpcDiaDto {
  fecha: string;
  totalProgramadas: number;
  cumplidas: number;
  porcentajePpc: number;
}

export interface PpcHistoricoDto {
  metaPpc: number | null;
  dias: PpcDiaDto[];
}

// ── Metas semanales (Plan Maestro) ──────────────────────────────────────

export interface MetaSemanalDto {
  id: number;
  macroActividadId: number;
  macroActividadNombre: string;
  fechaInicioSemana: string;
  fechaFinSemana: string;
  metaAvance: number;
}

export interface MetaSemanalItemDto {
  macroActividadId: number;
  fechaInicioSemana: string;
  fechaFinSemana: string;
  metaAvance: number;
}

export interface MetaSemanalUpdateDto {
  items: MetaSemanalItemDto[];
}

/** Meta vs. real, ambos como % ACUMULADO al cierre de cada semana (curva S). */
export interface PlanMaestroSemanaDto {
  macroActividadId: number;
  macroActividadNombre: string;
  fechaInicioSemana: string;
  fechaFinSemana: string;
  metaAvance: number;
  avanceReal: number;
}

// ── Pareto de causas de incumplimiento ──────────────────────────────────

export interface CausaParetoDto {
  causaId: number;
  causaNombre: string;
  cantidad: number;
  porcentaje: number;
}

export interface CausasParetoDto {
  totalNoCumplidas: number;
  causas: CausaParetoDto[];
}
