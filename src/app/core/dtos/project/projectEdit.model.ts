import { ProjectEstado } from './project.model';

export interface ProjectEditDTO {
    projectId: number;
    projectDescription: string;
    codigo?: string | null;
    levelDescription?: string | null;
    estado?: ProjectEstado | null;

    // Contribuyente / razón social
    contributorId?: number | null;
    legalEntityRegistryNumber?: string | null;

    // Ubicación
    projectDistrict?: string | null;
    projectProvince?: string | null;
    projectDepartment?: string | null;
    projectLocation?: string | null;

    // Responsable de arquitectura comercial
    responsableArqCom?: string | null;
    responsableArqComId?: number | null;

    // Fechas del proyecto
    fechaInicio?: string | null;
    fechaFin?: string | null;
    inicioObra?: string | null;
    finObra?: string | null;

    // Métricas físicas
    numNiveles?: string | null;
    numSotanos?: string | null;
    pisos?: string | null;
    tiempoConstruccion?: number | null;
    areaM2?: number | null;
    areaTechadaM2?: number | null;
    hhTotalCasa?: number | null;
    cantTrabajadoresCasa?: string | null;

    // Flags
    tieneArquitecturaComercial?: boolean | null;

    active: boolean;
}
