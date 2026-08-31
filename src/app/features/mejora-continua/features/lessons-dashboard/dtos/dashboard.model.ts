export interface ChartItemDTO {
  id: number;
  label: string;
  value: number;
}

export interface PhaseStageChartDTO {
  phaseId: number;
  phaseLabel: string;
  stages: ChartItemDTO[];
}

export interface DashboardSummaryDTO {
  totalLessons: number;
  totalProjects: number;
  totalAreas: number;
  totalPhases: number;
  totalUsers: number;
}

export interface PendingUserDTO {
  userId: number;
  fullName?: string;
  email?: string;
  projects: string[];
}

export interface LessonsDashboardDataDTO {
  summary: DashboardSummaryDTO;
  lessonsByMonth: ChartItemDTO[];
  lessonsByProject: ChartItemDTO[];
  lessonsByArea: ChartItemDTO[];
  lessonsByUser: ChartItemDTO[];
  lessonsByPhase: ChartItemDTO[];
  lessonsByPhaseAndStage: PhaseStageChartDTO[];
  lessonsBySubStage: ChartItemDTO[];
  /** Lecciones por Obra / Staff / Oficina Central (workers_obra_oficina_staff). */
  lessonsByObraOficina: ChartItemDTO[];
  pendingPeriodLabel: string;
  pendingUsers: PendingUserDTO[];
}

export interface DashboardPeriodDTO {
  periodDate: string | null;
}

export interface DashboardUserDTO {
  userId: number;
  fullName?: string;
}

export interface DashboardAreaDTO {
  lessonAreaId: number;
  areaDescription: string;
}

export interface DashboardProjectDTO {
  projectId: number;
  projectDescription: string;
}

export interface DashboardObraOficinaStaffDTO {
  obraOficinaStaffId: number;
  name: string;
}

export interface LessonsDashboardFiltersDTO {
  periods: DashboardPeriodDTO[];
  users: DashboardUserDTO[];
  areas: DashboardAreaDTO[];
  projects: DashboardProjectDTO[];
  /**
   * Opciones del filtro Obra / Staff / Oficina Central. Sustituye al nivel "Subárea"
   * de la cascada de áreas, que salía de los nodos de tipo "Área Obra_Oficina".
   */
  obraOficinaStaff: DashboardObraOficinaStaffDTO[];
}

export interface SelectedDashboardFilters {
  periodDate: string | null;
  userId: number;
  /** lesson_area_ids efectivos (subárbol del nodo de área donde se detuvo el usuario). */
  lessonAreaIds: number[];
  /** Filtro Obra / Staff / Oficina Central (null = todos). */
  obraOficinaStaffId: number | null;
  projectIds: number[];
  /** Estado de aprobación: null=Todos | PENDIENTE | APROBADA | RECHAZADA. Default 'APROBADA'. */
  approvalStatus: string | null;
}
