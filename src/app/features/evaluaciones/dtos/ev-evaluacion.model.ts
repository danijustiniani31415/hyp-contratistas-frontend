export interface EvDetalleCreateDto {
  plantillaId: number | null;
  criterio: string;
  puntaje: number | null;
  esNa: boolean;
}

export interface EvEvaluacionCreateDto {
  evaluadoUserId: number;
  projectId: number | null;
  areaNombre: string;
  comentario: string | null;
  noAplica: boolean;
  noAplicaMotivo: string | null;
  detalles: EvDetalleCreateDto[];
}

export interface EvDetalleResponseDto {
  id: number;
  plantillaId: number | null;
  criterio: string;
  puntaje: number | null;
  esNa: boolean;
}

export interface EvEvaluacionResponseDto {
  id: number;
  periodoId: number;
  nombreMes: string;
  evaluadorUserId: number;
  evaluadorNombre: string;
  evaluadoUserId: number;
  evaluadoNombre: string;
  projectId: number | null;
  projectNombre: string | null;
  areaNombre: string;
  nota: number | null;
  comentario: string | null;
  noAplica: boolean;
  noAplicaMotivo: string | null;
  createdAt: string;
  detalles: EvDetalleResponseDto[];
}
