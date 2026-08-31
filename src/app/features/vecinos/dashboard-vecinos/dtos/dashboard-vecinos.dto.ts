export interface DashboardEstadoDTO {
  estadoId: number;
  descripcion: string;
  count: number;
}

export interface DashboardLimpiezaCumplimientoDTO {
  departamentoProgramadas: number;
  departamentoHechas: number;
  comunProgramadas: number;
  comunHechas: number;
  totalProgramadas: number;
  totalHechas: number;
}

export interface DashboardProjectDTO {
  /** 0 cuando representa el resumen general (agregado global). */
  projectId: number;
  projectDescription: string;
  lotesCount: number;
  vecinosCount: number;
  solicitudes: DashboardEstadoDTO[];
  compromisos: DashboardEstadoDTO[];
  limpiezas: DashboardLimpiezaCumplimientoDTO;
}

export interface VecinosDashboardDTO {
  resumen: DashboardProjectDTO;
  proyectos: DashboardProjectDTO[];
}
