// ── Existing DTOs ─────────────────────────────────────────────────────────────
export interface ProyectoInfo {
  proyectoId: number;
  nombre: string;
}

export interface Staff {
  workerId: number;
  nombreCompleto: string;
  cargo: string;
  categoria?: string;
}

export interface CharlaResumen {
  id: number;
  fecha: string;
  titulo: string;
  tema: string;
  duracionHoras: number;
  totalAsistentes: number;
  asistentesIds: number[];
}

export interface AsistenciaDetail {
  workerId: number;
  nombreCompleto: string;
  asistio: boolean;
}

export interface ArchivoItem {
  id: number;
  url: string;
  nombre: string;
}

export interface Capacitacion {
  id: number | null;
  workerId: number;
  nombreCompleto: string;
  fecha: string | null;
  tema: string | null;
  evidenciaUrl: string | null;
  evidenciaNombre: string | null;
  estado: 'Falta' | 'Enviado' | 'Aprobado' | 'Rechazado';
  archivos: ArchivoItem[];
}

export interface Resumen {
  totalCharlas: number;
  totalAsistencias: number;
  capsTotal: number;
  capsFalta: number;
  capsEnviado: number;
  capsAprobado: number;
  capsRechazado: number;
}

export interface CrearCharlaDto {
  fecha: string;
  titulo: string;
  tema: string;
  duracionHoras: number;
  proyectoId: number;
}

export interface GuardarAsistenciaDto {
  workerIds: number[];
}

// ── NEW: Tab 1 — Dashboard Asistencia Supervisores ───────────────────────────
export interface DashSupervisoresRow {
  charlaId: number;
  titulo: string;
  fecha: string;
  supervisorId: number | null;
  supervisorNombre: string;
  totalAsistentes: number;
  totalAsistio: number;
}

// ── NEW: Tab 2 — Comparativo ──────────────────────────────────────────────────
export interface ComparativoMes {
  mes: number;
  mesNombre: string;
  programadas: number;
  realizadas: number;
}

// ── NEW: Tab 3 — Crear nueva charla ──────────────────────────────────────────
export interface NuevaCharlaCreateDto {
  programaId?: number;
  proyectoId: number;
  titulo: string;
  tema?: string;
  descripcion?: string;
  fecha: string;
  duracionHoras: number;
  supervisorId?: number;
  workerIds: number[];
}

// ── NEW: Tab 3 — Editar charla (cabecera + asistencia) ───────────────────────
export interface EditarCharlaDto {
  titulo: string;
  tema?: string;
  fecha: string;
  workerIds: number[];
}

// ── NEW: Tab 3 — Galería charlas proyecto ────────────────────────────────────
export interface CharlaGaleriaItem {
  id: number;
  titulo: string;
  tipo: string;
  fecha: string;
  totalAsistentes: number;
  totalAsistio: number;
}

// ── NEW: Tab 4 — Lista paginada ───────────────────────────────────────────────
export interface CharlaListItem {
  id: number;
  titulo: string;
  tema: string | null;
  fecha: string;
  supervisorId: number | null;
  supervisorNombre: string;
  estado: string;
  evidenciaNombre: string | null;
  totalAsistentes: number;
}

export interface CharlaListResult {
  items: CharlaListItem[];
  total: number;
}

// ── NEW: Tab 4 — Detalle modal ────────────────────────────────────────────────
export interface CharlaDetalle {
  id: number;
  titulo: string;
  tema: string | null;
  descripcion: string | null;
  fecha: string;
  duracionHoras: number;
  supervisorId: number | null;
  supervisorNombre: string;
  estado: string;
  evidenciaUrl: string | null;
  evidenciaNombre: string | null;
  totalAsistentes: number;
  asistencias: AsistenciaDetail[];
  aprobadoPorId: number | null;
  aprobadoPorNombre: string | null;
  aprobadoEn: string | null;
  motivoRechazo: string | null;
  evidenciaSubidaEn: string | null;
}

// ── NEW: Dashboard Por Persona (matriz semanal) ──────────────────────────────
export interface DashDiaSemana {
  numDia: number;
  nombre: string;
  fecha: string;
}

export interface DashPersonaAsistDia {
  numDia: number;
  asistio: boolean | null; // null = no hubo charla ese día para este worker
}

export interface DashPersonalItem {
  workerId: number;
  nombre: string;
  cargo: string;
  dias: DashPersonaAsistDia[];
  charlasAsistidas: number;
  charlasTotales: number;
  capsSemana: number;
  capsAprobMes: number;
  capsAcumMes: number;
}

export interface DashPersonalResult {
  dias: DashDiaSemana[];
  staff: DashPersonalItem[];
}

// ── NEW: Dashboard Por Proyecto ──────────────────────────────────────────────
export interface DashProyectoItem {
  proyectoId: number;
  nombre: string;
  totalStaff: number;
  charlasDictadas: number;
  totalAsistencias: number;
  totalPosiblesAsistencias: number;
  capsEnviadasSemana: number;
  capsAprobMes: number;
}

// ── NEW: Supervisor (app_user) ────────────────────────────────────────────────
export interface UsuarioDto {
  id: number;
  nombreCompleto: string;
  email: string | null;
}
