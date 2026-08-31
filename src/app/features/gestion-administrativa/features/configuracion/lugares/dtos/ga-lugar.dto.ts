export interface GaLugarConfigItemDto {
  /** null si el proyecto nunca fue activado en esta funcionalidad */
  gaLugarId: number | null;
  tipo: 'proyecto' | 'fijo';
  nombreDisplay: string;
  activo: boolean;
  /** solo para tipo='proyecto' */
  projectId: number | null;
}

export interface GaLugarCreateBatchDto {
  nombres: string[];
}

export interface GaLugarEditDto {
  nombre: string;
}

export interface ToggleProyectoResultDto {
  activo: boolean;
  gaLugarId: number;
}
