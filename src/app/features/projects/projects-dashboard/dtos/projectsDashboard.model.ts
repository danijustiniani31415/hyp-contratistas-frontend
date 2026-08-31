export interface ProjectsDashboardFilterItemDTO {
  id: number;
  nombre: string;
}

export interface ResponsableSimpleDTO {
  id: number;
  nombre: string;
}

export interface ProjectsDashboardFiltersDTO {
  proyectos: ProjectsDashboardFilterItemDTO[];
  estados: string[];
  responsables: ResponsableSimpleDTO[];
  especialidades?: string[];
}

// ── Dashboard principal ──────────────────────────────────────────────────────

export interface DistribucionEstadoDTO {
  estado: string;
  cantidad: number;
  porcentaje: number;
}

export interface RankingResponsableDTO {
  posicion: number;
  nombre: string;
  proyectos: number;
  completadas: number;
  vencidas: number;
  score: number;
}

export interface HeatmapSemanaDTO {
  semana: string;
  cantidad: number;
}

export interface HeatmapResponsableDTO {
  responsable: string;
  semanas: HeatmapSemanaDTO[];
}

export interface ProjectsDashboardItemDTO {
  proyectoId: number;
  projectDescription: string;
  estado: string;
  responsableNombre: string | null;
  avanceProgramado: number;
  avanceReal: number;
  tieneRetraso: boolean;
  diasRetraso: number;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  actividadesVencidas: number;
}

export interface ProjectsDashboardDTO {
  totalProyectos: number;
  alDia: number;
  conRetraso: number;
  avancePromedio: number;
  actividadesVencidas: number;
  proyectos: ProjectsDashboardItemDTO[];
  distribucionPorEstado: DistribucionEstadoDTO[];
  rankingResponsables: RankingResponsableDTO[];
  heatmapCarga: HeatmapResponsableDTO[];
}

// FIX-C: respuesta del endpoint unificado GET /projects-dashboard (filters + data en un solo request)
export interface ProjectsDashboardResponseDto extends ProjectsDashboardDTO {
  filtros: ProjectsDashboardFiltersDTO;
}

// ── Detalle de proyecto (panel lateral) ─────────────────────────────────────

export interface ActividadCriticaDTO {
  nombre: string;
  responsable: string | null;
  fechaFin: string;
  diasRetraso: number;
}

export interface GanttTareaDTO {
  id: number | string;
  text: string;
  start_date: string;
  duration: number;
  parent?: number | string;
  progress?: number;
  open?: boolean;
}

export interface ProyectoDetalleDTO {
  proyectoId: number;
  proyectoNombre: string;
  estado: string;
  avanceProgramado: number;
  avanceReal: number;
  diasRetraso: number;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  actividadesVencidas: ActividadCriticaDTO[];
  actividadesCriticas: ActividadCriticaDTO[];
  gantt: {
    tasks: GanttTareaDTO[];
    links: { id: number; source: number; target: number; type: string }[];
  };
}
