export interface SctrWorkerInputDto {
  workerId: number;
  fechaInicioCobertura?: string;
}

export interface SctrWorkerDto {
  workerId: number;
  apellidoNombre: string;
  dni: string;
  estadoSctr: string;
  estadoVidaLey: string;
  estado?: string;
  sctrHabId?: number;
  fechaInicioCobertura?: string;
  vigencia?: string;
  fechaVencimiento?: string;
}

export interface SctrVidaLeyDto {
  id: number;
  empresaId: number;
  empresaNombre: string;
  proyectoId: number;
  proyectoNombre: string;
  tipo: string;
  tipoPoliza: string;
  mes: number;
  anio: number;
  fechaInicio?: string;
  archivoUrl?: string;
  archivoUrl2?: string;
  estado: string;
  vigencia?: string;
  obsAbril?: string;
  workers: SctrWorkerDto[];
}

export interface SctrVidaLeyCreateDto {
  proyectoId?: number;
  tipo: string;
  tipoPoliza: string;
  mes: number;
  anio: number;
  fechaInicio?: string;
  vigencia?: string;
  archivoUrl?: string;
  archivoUrl2?: string;
  workers: SctrWorkerInputDto[];
}

export interface SctrTrabajadorEstadoDto {
  workerId: number;
  apellidoNombre: string;
  dni: string;
  estadoSctr: string;
  estadoVidaLey: string;
  obraOficina?: string;
  sctrId?: number;
  sctrHabId?: number;
  archivoUrl?: string;
  empresaNombre?: string;
  proyectoNombre?: string;
  fechaVencimiento?: string;
  updatedAt?: string;
}

export interface SctrVidaLeyAprobarDto {
  workerIdsAprobados: number[];
  workerIdsRechazados: number[];
  tipo?: string;
  obsAbril?: string;
  vigencia?: string;
}
