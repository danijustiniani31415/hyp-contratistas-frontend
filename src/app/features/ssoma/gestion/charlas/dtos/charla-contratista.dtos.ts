export interface CharlaContratistaPendienteDto {
  proyectoId: number;
  proyectoNombre: string;
  fecha: string;
  cantidadPersonasTareadas: number;
  yaSubida: boolean;
  charlaId: number | null;
}

export interface CharlaContratistaUploadRequest {
  proyectoId: number;
  fecha: string;
  tema: string;
  descripcion?: string;
  evidenciaBase64?: string;
  evidenciaNombre?: string;
}

export interface CharlaContratistaDto {
  id: number;
  proyectoId: number;
  proyectoNombre: string;
  fecha: string;
  tema: string;
  descripcion?: string;
  evidenciaUrl?: string;
  evidenciaNombre?: string;
  createdAt: string;
  estado: 'Enviado' | 'Aprobado' | 'Rechazado';
  aprobadoPorNombre?: string;
  aprobadoEn?: string;
  motivoRechazo?: string;
  /** Solo viene poblado en la lista de revisión SSOMA, no en "mi historial" del contratista. */
  empresaNombre?: string;
}

export interface RechazarCharlaContratistaDto {
  motivo: string;
}

export interface CharlaContratistaRevisionResult {
  items: CharlaContratistaDto[];
  total: number;
}
