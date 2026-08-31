export interface EvPlantillaDto {
  id: number;
  areaNombre: string;
  criterio: string;
  orden: number;
  activo: boolean;
  version: number;
}

export interface EvPlantillaCreateDto {
  areaNombre: string;
  criterio: string;
  orden: number;
}

export interface EvPlantillaUpdateDto {
  criterio: string;
  activo: boolean;
}
