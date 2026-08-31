import { CausasParetoDto } from './planeamiento-bim-dashboard.dto';

export interface ProyectosPorFaseDto {
  faseId: number;
  faseNombre: string;
  cantidadProyectos: number;
}

export interface PortafolioKpisDto {
  ppcPromedioUltimaSemana: number;
  proyectosPorFase: ProyectosPorFaseDto[];
  proyectosConBloqueosVencidos: number;
  causasTopMes: CausasParetoDto;
}

export type SemaforoPortafolio = 'VERDE' | 'AMARILLO' | 'ROJO' | 'GRIS';

export interface ProyectoPortafolioDto {
  projectId: number;
  projectNombre: string;
  totalRegistros: number;
  cumplidosRegistros: number;
  /** null = sin registros (Semaforo = "GRIS"). */
  porcentajeAvance: number | null;
  semaforo: SemaforoPortafolio;
}
