export interface AuditoriaAtsPreguntaDto {
  id: number;
  orden: number;
  texto: string;
}

export interface AuditoriaAtsListItemDto {
  id: number;
  fecha: string;
  auditorNombre: string;
  auditorEmpresaNombre?: string;
  auditorCategoria?: string;
  auditorOcupacion?: string;
  auditadoNombre: string;
  auditadoEmpresaNombre?: string;
  auditadoCategoria?: string;
  auditadoOcupacion?: string;
  proyectoNombre?: string;
  actividad?: string;
  lugar?: string;
  puntajePromedio?: number;
  nivel?: string;
  estado: string;
  createdAt: string;
}

export interface AuditoriaAtsRespuestaDto {
  preguntaId: number;
  preguntaTexto: string;
  puntaje: number;
  comentario?: string;
}

export interface AuditoriaAtsDetalleDto {
  id: number;
  fecha: string;
  auditorWorkerId: number;
  auditorNombre: string;
  auditorEmpresaNombre?: string;
  auditorCategoria?: string;
  auditorOcupacion?: string;
  auditadoWorkerId: number;
  auditadoNombre: string;
  auditadoEmpresaNombre?: string;
  auditadoCategoria?: string;
  auditadoOcupacion?: string;
  proyectoId?: number;
  proyectoNombre?: string;
  emailAuditado?: string;
  actividad?: string;
  lugar?: string;
  puntajePromedio?: number;
  nivel?: string;
  observaciones?: string;
  estado: string;
  fotos: string[];
  respuestas: AuditoriaAtsRespuestaDto[];
  createdAt: string;
}

export interface CrearAuditoriaAtsRequest {
  fecha: string;
  auditorWorkerId: number;
  auditadoWorkerId: number;
  proyectoId?: number;
  emailAuditado?: string;
  actividad?: string;
  lugar?: string;
  observaciones?: string;
  fotosBase64: string[];
  respuestas: { preguntaId: number; puntaje: number; comentario?: string }[];
}

export interface AuditoriaAtsFiltros {
  auditadoWorkerId?: number;
  auditorWorkerId?: number;
  proyectoId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
  page?: number;
  pageSize?: number;
}
