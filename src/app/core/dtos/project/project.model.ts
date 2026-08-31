export type ProjectEstado = 'ACTIVO' | 'FINALIZADO' | 'INACTIVO' | string;

export interface ProjectGetDTO {
    projectId: number;
    projectDescription: string;
    projectCode?: string;
    companyId?: number;
    companyName?: string;
    estado?: ProjectEstado;
    responsable?: string;
    emailResidente?: string;
    emailResponsable?: string;
    emailRrhh?: string;
    emailCoordSsoma?: string;
    emailCoordAdmin?: string;
    fechaInicio?: string;
    fechaFin?: string;
    areaM2?: number;
    levelDescription?: string;
    residentFullNames: string[];
    createdDateTime: string;
    createdUserId: number;
    updatedDateTime?: string;
    updatedUserId?: number;
    active: boolean;
    fotoUrl?: string;
    tieneArquitecturaComercial?: boolean;
}
