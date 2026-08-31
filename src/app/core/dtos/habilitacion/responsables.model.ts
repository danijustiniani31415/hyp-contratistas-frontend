export interface ResponsableWorkerOptionDTO {
  workerId: number;
  nombreCompleto: string;
  email: string;
}

export interface ResponsableRazonSocialDTO {
  contributorId: number;
  contributorName: string;
  emailAdministrador: string | null;
}

export interface ResponsableProyectoDTO {
  projectId: number;
  projectDescription: string;
  residenteWorkersId: number | null;
  residenteNombre: string | null;
  residenteEmail: string | null;
  emailResponsable: string | null;
  emailRrhh: string | null;
  emailCoordSsoma: string | null;
  emailCoordAdmin: string | null;
}

export interface ResponsableProyectoUpdateDTO {
  residenteWorkersId: number | null;
  emailResponsable: string | null;
  emailRrhh: string | null;
  emailCoordSsoma: string | null;
  emailCoordAdmin: string | null;
}

export interface ResponsablesDTO {
  razonesSociales: ResponsableRazonSocialDTO[];
  proyectos: ResponsableProyectoDTO[];
  trabajadores: ResponsableWorkerOptionDTO[];
}
