export interface CronogramaDashboardKpisDto {
  totalProyectos: number;
  porcentajeAvancePromedio: number;
  proyectosAlDia: number;
  proyectosConRetraso: number;
  proyectosSinActividades: number;
  actividadesVencidas: number;
  actividadesCulminadasEstaSemana: number;
  actividadesCulminadasEsteMes: number;
}

export interface CronogramaDashboardProyectoDto {
  projectId: number;
  projectDescription: string;
  responsableUdp: string;
  totalActividades: number;
  culminadas: number;
  enProceso: number;
  vencidas: number;
  pendientes: number;
  porcentajeAvance: number;
  diasRetraso: number;
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
  estado: 'AL_DIA' | 'CON_RETRASO' | 'SIN_ACTIVIDADES';
  spi: number;
}

export interface CronogramaDashboardResponsableDto {
  userId: number;
  nombreCompleto: string;
}

export interface CronogramaDashboardResponseDto {
  kpis: CronogramaDashboardKpisDto;
  proyectos: CronogramaDashboardProyectoDto[];
  responsables: CronogramaDashboardResponsableDto[];
}
