export interface InduccionTrabajadorDto {
  workerId: number;
  apellidoNombre: string;
  dni: string;
  obraOficina?: string;
  empresaId?: number;
  empresaNombre?: string;
  yaIndujo?: boolean;
}

export interface InduccionDto {
  id: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  proyectoId: number;
  proyectoNombre: string;
  empresaId: number;
  empresaNombre: string;
  fechaProgramada: string;
  trabajoAltura: boolean;
  estado: string;
  programadoPor?: number;
}

export interface InduccionCreateDto {
  workerId: number;
  proyectoId: number;
  empresaId: number;
  fechaProgramada: string;
  trabajoAltura: boolean;
}

export interface InduccionListDto {
  id: number;
  workerId: number;
  apellidoNombre: string;
  dni: string;
  proyectoId: number;
  proyectoNombre: string;
  empresaId: number;
  empresaNombre: string;
  contrataCasa?: string;
  fechaProgramada: string;
  trabajoAltura: boolean;
  equipoElectrico: boolean;
  estado: string;
  ingresoConfirmado: boolean;
  fechaIngreso?: string;
}

export interface InduccionReprogramarDto {
  fechaProgramada: string;
  proyectoId: number;
  trabajoAltura: boolean;
}

export interface InduccionBatchCreateDto {
  proyectoId: number;
  empresaId?: number;
  fechaProgramada: string;
  trabajoAltura: boolean;
  equipoElectrico: boolean;
  workerIds: number[];
}
