export type TareoTipo = 'INICIO_JORNADA' | 'INICIO_ALMUERZO' | 'RETORNO' | 'FIN_JORNADA';
export type TareoEstado = 'PENDIENTE' | 'VERIFICADO' | 'REVISAR' | 'RECHAZADO' | 'SIN_ENROLAR';

export interface TareoEnrolamientoEstadoDTO {
  enrolado: boolean;
  fechaEnrolamiento: string | null;
}

export interface TareoEnrolamientoRequestDTO {
  fotoBase64: string;
  embedding: number[];
}

/** Fila de la pantalla de "Gestión de permisos" del coordinador. */
export interface TareoTrabajadorEnrolamientoDTO {
  workerId: number;
  nombre: string;
  enrolado: boolean;
  fechaEnrolamiento: string | null;
  /** SSO-FO-150 firmado y subido — sin esto el enrolamiento queda bloqueado. */
  autorizacionSubida: boolean;
  autorizacionSubidaEn: string | null;
  /** URL del escaneo firmado, para verlo/descargarlo a solicitud. Solo viene poblada en el
   * listado del coordinador (getTrabajadoresParaEnrolar) — el de autoservicio
   * (getTrabajadoresDisponiblesParaEnrolar) siempre la manda null. */
  autorizacionUrl: string | null;
}

/** Resultado de la identificación 1:N contra los enrolados de Arquitectura Comercial. */
export interface TareoIdentificacionDTO {
  identificado: boolean;
  workerId: number | null;
  nombre: string | null;
}

/** Geolocalización de un proyecto para el geofencing de Marcar Tareo. */
export interface TareoProyectoGeoDTO {
  projectId: number;
  projectDescription: string;
  lat: number | null;
  lng: number | null;
  radioGeofenceMetros: number;
}

export interface TareoProyectoGeoUpdateDTO {
  lat: number | null;
  lng: number | null;
  radioGeofenceMetros: number | null;
}

export interface TareoMarcarRequestDTO {
  tipo: TareoTipo;
  fotoBase64: string;
  /** Embedding facial (128 floats) recién calculado sobre la foto — el backend calcula la
   * similitud contra el embedding enrolado, nunca se manda un score ya calculado. */
  embedding: number[] | null;
  horaDispositivo: string;
  lat: number | null;
  lng: number | null;
  precisionMetros: number | null;
}

export interface TareoRegistroDTO {
  id: number;
  workerId: number;
  tipo: TareoTipo;
  fecha: string;
  horaServidor: string;
  fotoUrl: string;
  lat: number | null;
  lng: number | null;
  projectId: number | null;
  projectNombre: string | null;
  distanciaMetros: number | null;
  faceMatchScore: number | null;
  estado: TareoEstado;
  motivoRevision: string | null;
  yaExistia: boolean;
}

export interface TareoMiTareoHoyDTO {
  inicioJornada: TareoRegistroDTO | null;
  inicioAlmuerzo: TareoRegistroDTO | null;
  retorno: TareoRegistroDTO | null;
  finJornada: TareoRegistroDTO | null;
}

export interface TareoRegistroListaDTO {
  id: number;
  workerId: number;
  workerNombre: string;
  tipo: TareoTipo;
  fecha: string;
  horaServidor: string;
  fotoUrl: string;
  projectNombre: string | null;
  distanciaMetros: number | null;
  faceMatchScore: number | null;
  estado: TareoEstado;
  motivoRevision: string | null;
}

export interface TareoRegistroListResponseDTO {
  items: TareoRegistroListaDTO[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface TareoFiltroParams {
  workerId?: number | null;
  proyectoId?: number | null;
  desde?: string | null;
  hasta?: string | null;
  estado?: TareoEstado | null;
  pagina: number;
  porPagina: number;
}

export interface TareoRevisarRequestDTO {
  aprobar: boolean;
  comentario?: string | null;
}

export interface TareoReporteDiaDTO {
  fecha: string;
  inicioJornada: string | null;
  inicioAlmuerzo: string | null;
  retorno: string | null;
  finJornada: string | null;
  totalHoras: number | null;
}

export interface TareoReporteSemanalDTO {
  workerId: number;
  workerNombre: string;
  dias: TareoReporteDiaDTO[];
  totalHorasSemana: number;
}

export const TAREO_TIPO_LABEL: Record<TareoTipo, string> = {
  INICIO_JORNADA: 'Inicio de jornada',
  INICIO_ALMUERZO: 'Inicio de almuerzo',
  RETORNO: 'Retorno de almuerzo',
  FIN_JORNADA: 'Fin de jornada',
};

export const TAREO_ESTADO_LABEL: Record<TareoEstado, string> = {
  PENDIENTE: 'Pendiente',
  VERIFICADO: 'Verificado',
  REVISAR: 'Por revisar',
  RECHAZADO: 'Rechazado',
  SIN_ENROLAR: 'Sin enrolar',
};
