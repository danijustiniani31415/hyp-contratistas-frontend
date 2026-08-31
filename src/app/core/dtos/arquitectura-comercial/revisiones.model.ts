export type TipoRevision = 'R1' | 'R2' | 'R1-AC' | 'R2-AC' | 'RF-AC';

export const TIPOS_REVISION: TipoRevision[] = ['R1', 'R2', 'R1-AC', 'R2-AC', 'RF-AC'];

export interface RevisionDTO {
  id: number;
  proyectoId: number;
  proyectoNombre: string | null;
  tipo: string;
  lugar: string;
  nombre: string;
  activo: boolean;
}

export interface CreateRevisionBody {
  proyectoId: number;
  tipo: string;
  lugar: string;
}

export interface RevisionObservacionFotoDTO {
  id: number;
  tipo: 'Observacion' | 'Levantamiento';
  url: string;
  orden: number;
}

export interface RevisionObservacionListItemDTO {
  id: number;
  revisionId: number;
  revisionNombre: string | null;
  proyectoId: number;
  proyectoNombre: string | null;
  fecha: string;
  personaReporta: string | null;
  zonaAmbiente: string | null;
  partidaReportada: string | null;
  descripcion: string;
  plazoLevantamiento: string | null;
  estado: string;
  origen: string;
  levantaPorWorkerId: number | null;
  levantaPorNombre: string | null;
  fotos: RevisionObservacionFotoDTO[];
}

export interface RevisionObservacionListResponseDTO {
  total: number;
  pagina: number;
  porPagina: number;
  items: RevisionObservacionListItemDTO[];
}

export interface ProyectoRevisionFiltroDTO {
  id: number;
  nombre: string;
}

export interface RevisionFiltrosDTO {
  proyectos: ProyectoRevisionFiltroDTO[];
  partidas: string[];
  estados: string[];
  tipos: string[];
}

export interface RevisionObservacionesQueryParams {
  revisionId?: number | null;
  proyectoId?: number | null;
  estado?: string | null;
  partida?: string | null;
  desde?: string | null;
  hasta?: string | null;
  search?: string | null;
  pagina: number;
  porPagina: number;
}

export interface CreateRevisionObservacionBody {
  revisionId: number;
  fecha: string;
  personaReporta?: string | null;
  zonaAmbiente?: string | null;
  descripcion: string;
  plazoLevantamiento?: string | null;
  partidaReportada?: string | null;
  creadoPor?: string | null;
}

export interface UpdateRevisionObservacionBody {
  zonaAmbiente?: string | null;
  descripcion?: string | null;
  partidaReportada?: string | null;
  personaReporta?: string | null;
}

export interface RevisionObservacionPorPartidaDTO {
  partida: string;
  completado: number;
  pendiente: number;
}

export interface RevisionDashboardGrupoDTO {
  personaReporta: string;
  revisionNombre: string | null;
  totalReportadas: number;
  totalCompletadas: number;
  totalPendientes: number;
  totalEnProceso: number;
  pctAvance: number;
  porPartida: RevisionObservacionPorPartidaDTO[];
}

export interface RevisionDashboardDTO {
  grupos: RevisionDashboardGrupoDTO[];
}

export interface RevisionObservacionStatsDTO {
  reportados: number;
  completados: number;
  pendientes: number;
  enProceso: number;
}
