export interface CasoSocialListItemDto {
  id: string;
  workerId: number;
  workerNombre: string | null;
  workerDni: string | null;
  empresaNombre: string | null;
  proyectoNombre: string | null;
  fechaApertura: string;
  tipoCaso: string;
  prioridad: string;
  estado: string;
  fechaCierre: string | null;
  totalSeguimientos: number;
}

export interface SeguimientoDto {
  id: string;
  casoId: string;
  fecha: string;
  tipo: string;
  descripcion: string | null;
  responsableId: number | null;
  responsableNombre: string | null;
  proximaAccion: string | null;
  accionTomada: string | null;
  createdAt: string;
}

export interface CasoSocialDetalleDto {
  id: string;
  workerId: number;
  workerNombre: string | null;
  workerDni: string | null;
  proyectoId: number | null;
  proyectoNombre: string | null;
  empresaId: number | null;
  empresaNombre: string | null;
  fechaApertura: string;
  tipoCaso: string;
  prioridad: string;
  motivo: string | null;
  descripcion: string | null;
  estado: string;
  fechaCierre: string | null;
  resultado: string | null;
  registradoPorId: number | null;
  cerradoPorId: number | null;
  seguimientos: SeguimientoDto[];
}

export interface CasoSocialCreateDto {
  workerId: number;
  proyectoId?: number | null;
  empresaId?: number | null;
  fechaApertura: string;
  tipoCaso: string;
  prioridad: string;
  motivo?: string | null;
  descripcion?: string | null;
}

export interface CasoSocialUpdateDto {
  proyectoId?: number | null;
  empresaId?: number | null;
  fechaApertura: string;
  tipoCaso: string;
  prioridad: string;
  motivo?: string | null;
  descripcion?: string | null;
}

export interface CasoSocialCerrarDto {
  fechaCierre: string;
  resultado?: string | null;
}

export interface CasoSocialFilterDto {
  workerId?: number;
  estado?: string;
  tipoCaso?: string;
  prioridad?: string;
  empresaId?: number;
  page?: number;
}

export interface SeguimientoCreateDto {
  fecha: string;
  tipo: string;
  descripcion?: string | null;
  responsableId?: number | null;
  proximaAccion?: string | null;
  accionTomada?: string | null;
}

// ── SCTR ──────────────────────────────────────────────────────────────────────

export interface SctrGestionDto {
  id: number;
  casoSocialId: string;
  numeroSiniestro?: string | null;
  fechaReporteSctr?: string | null;
  fechaAtencionSctr?: string | null;
  aseguradora?: string | null;
  montoCubierto?: number | null;
  urlHojaAtencion?: string | null;
  urlDocumentosAdicionales?: string | null;
  estadoId: number;
  estadoNombre: string;
  observaciones?: string | null;
  createdAt: string;
}

export interface SctrGestionCreateDto {
  numeroSiniestro?: string | null;
  fechaReporteSctr?: string | null;
  fechaAtencionSctr?: string | null;
  aseguradora?: string | null;
  montoCubierto?: number | null;
  estadoId: number;
  observaciones?: string | null;
}

export interface SctrGestionUpdateDto {
  numeroSiniestro?: string | null;
  fechaReporteSctr?: string | null;
  fechaAtencionSctr?: string | null;
  aseguradora?: string | null;
  montoCubierto?: number | null;
  estadoId: number;
  observaciones?: string | null;
}
