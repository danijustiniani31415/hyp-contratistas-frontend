export interface ProyectoAsignadoDto {
  projectId: number;
  projectDescription: string;
}

export interface SupervisorAsignacionDto {
  workerId: number;
  nombreCompleto: string;
  cargo: string;
  subarea: string;
  proyectos: ProyectoAsignadoDto[];
}

export interface UpdateAsignacionDto {
  projectIds: number[];
}
