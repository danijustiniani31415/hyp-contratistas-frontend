import {
  ConsolidadoS10Ambito,
  ConsolidadoS10Dto,
} from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';

export interface GestionSalidaListItemDto {
  id: number;
  workerId: number;
  trabajador: string;
  /**
   * Área del trabajador: solo el área más baja a la que pertenece (el nodo de
   * workers.area_scope_id). La ruta completa va en el detalle (`areaRuta`).
   */
  area: string | null;
  /**
   * Nombre completo del jefe/revisor del solicitante — el mismo al que se le notificó la
   * solicitud. Cuando la resolución cae al fallback de GTH es el nombre del área.
   */
  revisorNombre: string | null;
  fechaSalida: string;
  horaSalida: string;
  horaRetorno: string | null;
  motivo: string;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  trayectosCount: number;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  puedeRendirse: boolean;
  /** Hora real de salida registrada por recepción ("HH:mm:ss") — dato extra. */
  horaSalidaReal: string | null;
  /** Hora real de retorno registrada por recepción ("HH:mm:ss") — dato extra. */
  horaRetornoReal: string | null;
  /**
   * True cuando todos los trayectos tienen motivos con "es hora estimada": las horas declaradas
   * son estimadas y recepción no registra la hora real de salida/retorno para esta solicitud.
   */
  esHoraEstimada: boolean;
  /**
   * True si el usuario logueado puede aprobar/rechazar esta salida. False cuando es su propia
   * salida y no es Gerente (nadie aprueba lo suyo salvo gerentes). No afecta la rendición.
   */
  puedeDecidir: boolean;
  /**
   * True si la salida es del propio usuario logueado. Habilita "Cancelar": un trabajador solo
   * puede cancelar SUS propias solicitudes Pendientes.
   */
  esPropia: boolean;

  // ── Consolidado del S10 (solo salidas rendidas) ──────────────────────
  /** URL del PDF Consolidado del S10 vigente, o null si aún no se adjuntó. */
  consolidadoS10Url: string | null;
  /** Nombre del archivo del consolidado vigente. Null si no hay. */
  consolidadoS10Filename: string | null;
  /** "Rendicion" (cubre toda la planilla) | "Solicitud" (solo esta salida) | null si no hay. */
  consolidadoS10Ambito: ConsolidadoS10Ambito | null;

  // ── Reembolso ────────────────────────────────────────────────────────
  /**
   * Eje aparte de la aprobación de la salida y de la rendición: es el visto bueno al GASTO.
   * "Pendiente" | "Aprobado" | "Rechazado" | "Firmado" | "Pagado".
   */
  estadoReembolso: EstadoReembolso;
  /**
   * True cuando ya hay algo que revisar: la salida está rendida y tiene adjunto el Consolidado
   * del S10. Es lo que habilita Aprobar/Rechazar reembolso.
   */
  reembolsoRevisable: boolean;
  /** Observación del último rechazo — lo que el trabajador tiene que subsanar. */
  observacionReembolso: string | null;
  /** Nombre de quien aprobó/rechazó el reembolso. */
  reembolsoDecididoPor: string | null;
  reembolsoDecididoAt: string | null;
  /** Última vez que el trabajador avisó al revisor que ya adjuntó el S10. */
  revisorNotificadoAt: string | null;
  /** webUrl de la planilla de rendición ya FIRMADA. Null mientras nadie la firme. */
  planillaFirmadaUrl: string | null;
}

/** Los cinco estados por los que pasa el reembolso de una salida rendida. */
export type EstadoReembolso = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Firmado' | 'Pagado';

/** Respuesta paginada genérica del backend (PagedResult<T>). */
export interface PagedResponseDto<T> {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: T[];
}

export interface GestionSalidaFilterDataDto {
  trabajadores: TrabajadorOptionDto[];
  lugaresProyecto: LugarProyectoOptionDto[];
  /** Árbol area_scope (lista plana) para el filtro de área en cascada. */
  areaTree: AreaNodeDto[];
  /**
   * True si el usuario entra en modo TESORERÍA (rol TESORERO + puesto de categoría Tesorero).
   * Lo decide el backend: el frontend solo ve el rol del token, y la categoría vive en la base.
   */
  esTesorero: boolean;
}

/** Nodo del árbol area_scope; el frontend arma la jerarquía a partir de la lista plana. */
export interface AreaNodeDto {
  areaScopeId: number;
  areaItemId: number;
  areaItemName: string;
  areaTypeId: number;
  areaTypeName: string;
  areaScopeParentId?: number | null;
  displayOrder: number;
}

export interface TrabajadorOptionDto {
  workerId: number;
  nombreCompleto: string;
}

export interface LugarProyectoOptionDto {
  gaLugarId: number;
  nombreDisplay: string;
}

export interface GestionSalidaRendicionDto {
  id: number;
  pdfUrl: string;
  pdfFilename: string;
  rendidoAt: string;
  /** webUrl de la copia FIRMADA por la jefatura. Null mientras nadie la firme. */
  pdfFirmadoUrl: string | null;
}

export interface GestionSalidaCapturaDto {
  id: number;
  imageUrl: string;
  filename: string;
  monto: number;
  uploadedAt: string;
}

export interface GestionSalidaAdjuntoDto {
  url: string;
  filename: string;
}

export interface GestionSalidaTrayectoDto {
  id: number;
  orden: number;
  horaSalida: string;
  horaRetorno: string | null;
  motivo: string;
  /** Detalle que acompaña al motivo cuando este lo exige. Null si no aplica. */
  motivoAdicional: string | null;
  lugarOrigen: string | null;
  lugarDestino: string | null;
  /** Documentos adjuntos del trayecto (motivos que requieren documento). Vacío si no tiene. */
  adjuntos: GestionSalidaAdjuntoDto[];
  capturas: GestionSalidaCapturaDto[];
  /** Monto del catálogo ga_trayecto (solo trabajador TI con match). */
  montoCatalogo: number | null;
  /** Monto efectivo: suma capturas o montoCatalogo. */
  montoTotal: number;
}

export interface GestionSalidaDetalleDto {
  id: number;
  workerId: number;
  trabajador: string;
  /** Área más baja del trabajador (último nodo de `areaRuta`). */
  area: string | null;
  /**
   * Ruta completa del área, de la raíz al nodo del trabajador
   * (ej. ['Gerencia de Proyectos', 'Unidad de Proyectos', 'Unidad de Proyectos']).
   */
  areaRuta: string[];
  /** Nombre completo del jefe/revisor (o el área en el fallback de GTH). */
  revisorNombre: string | null;
  /** Correo corporativo al que se le notificó la solicitud. */
  revisorEmail: string | null;
  fechaSalida: string;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  motivoRechazo: string | null;

  // ── Reembolso ────────────────────────────────────────────────────────
  estadoReembolso: EstadoReembolso;
  observacionReembolso: string | null;
  reembolsoDecididoPor: string | null;
  reembolsoDecididoAt: string | null;
  firmadoPor: string | null;
  firmadoAt: string | null;
  pagadoPor: string | null;
  pagadoAt: string | null;

  rendicion: GestionSalidaRendicionDto | null;
  /** Consolidado del S10 vigente (propio de la salida o heredado de su planilla). Null si no hay. */
  consolidadoS10: ConsolidadoS10Dto | null;
  trayectos: GestionSalidaTrayectoDto[];
}

/** Resultado de una acción en bloque sobre el reembolso (aprobar, rechazar, firmar, pagar). */
export interface ReembolsoBulkResultDto {
  procesadas: number;
  /** Cuántas planillas distintas se firmaron. Solo lo llena la acción de firmar. */
  planillasFirmadas: number;
  message: string;
}
