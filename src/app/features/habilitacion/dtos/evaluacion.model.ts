export interface EvalSupervisorListDto {
  id: number;
  workerId: number;
  workerNombre: string;
  workerDni: string;
  empresaNombre: string;
  proyectoNombre: string;
  mes: number;
  anio: number;
  notaTotal?: number;
  evaluadorNombre?: string;
}

export interface EvalItemDto {
  criterioId: number;
  criterio: string;
  nota: number;
}

export interface EvalSupervisorDetalleDto extends EvalSupervisorListDto {
  items: EvalItemDto[];
}

export interface EvalCreateDto {
  workerId: number;
  empresaId: number;
  proyectoId: number;
  mes: number;
  anio: number;
  items: { criterioId: number; nota: number }[];
}

export interface CriterioEvalDto {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}
