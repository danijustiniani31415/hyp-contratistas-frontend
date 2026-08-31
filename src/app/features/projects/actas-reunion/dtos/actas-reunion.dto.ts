export interface CatalogoDTO {
  id: number;
  descripcion: string;
}

export interface ProyectoFiltroDTO {
  projectId: number;
  projectDescription: string;
}

/**
 * Tema del desplegable "Tema de la reunión", con el área/gerencia de su convocatoria recurrente
 * (si tiene) para poder ocultarlo cuando no aplica al ámbito elegido — ej. "Reunión de Jefaturas
 * de Proyectos" (areaScopeId = Gerencia de Proyectos) no debe salir al agendar una reunión de un
 * proyecto puntual. areaScopeId null = sin área asociada, aplica a cualquier ámbito.
 */
export interface ReunionTemaOpcionDTO {
  id: number;
  descripcion: string;
  areaScopeId: number | null;
}

/** Trabajador de Abril (workers con email_corporativo @abril.pe) para los desplegables. */
export interface TrabajadorAbrilDTO {
  workerId: number;
  fullName: string;
  /** Nombre del puesto del trabajador (catálogo `puesto`). */
  cargo: string | null;
}

export interface PagedResultDTO<T> {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: T[];
}

export interface ReunionListItemDTO {
  reunionId: number;
  projectId: number | null;
  projectDescription: string | null;
  /** Nodo del árbol area_scope (gerencia/área/subárea); null si la reunión es de proyecto o de toda la organización. */
  areaScopeId: number | null;
  areaScopeDescripcion: string | null;
  numero: number;
  tema: string;
  lugar: string | null;
  fecha: string; // YYYY-MM-DD
  horaInicio: string | null; // HH:mm:ss
  horaFin: string | null;
  reunionEstadoId: number;
  reunionEstado: string;
  totalAcuerdos: number;
  acuerdosCumplidos: number;
  vecesReprogramada: number;
  totalArchivos: number;
}

export interface ReunionPaginaInicialDTO {
  proyectos: ProyectoFiltroDTO[];
  reunionEstados: CatalogoDTO[];
  trabajadores: TrabajadorAbrilDTO[];
  /** Temas predefinidos para el desplegable de "Tema de la reunión" al agendar. */
  temas: ReunionTemaOpcionDTO[];
  reuniones: PagedResultDTO<ReunionListItemDTO>;
}

export interface ReunionParticipanteDTO {
  reunionParticipanteId: number;
  workerId: number | null;
  nombre: string;
  cargo: string | null;
  iniciales: string | null;
  asistio: boolean;
  orden: number;
  /** true si este participante puede editar el acta igual que su creador. */
  esCoautor: boolean;
}

/** Responsable de un acuerdo, con su estado de aceptación individual. */
export interface ReunionAcuerdoResponsableDTO {
  reunionAcuerdoResponsableId: number;
  workerId: number;
  workerNombre: string;
  /** PENDIENTE | ACEPTADO | RECHAZADO. */
  estadoAceptacion: string;
  motivoRechazo: string | null;
  /** true cuando este responsable es el encargado principal de que el acuerdo se cumpla. */
  esPrincipal: boolean;
}

export interface ReunionAcuerdoDTO {
  reunionAcuerdoId: number;
  descripcion: string;
  acciones: string | null;
  fechaProgramada: string | null;
  fechaReprogramacion: string | null;
  fechaCumplimiento: string | null;
  reunionAcuerdoEstadoId: number;
  reunionAcuerdoEstado: string;
  orden: number;
  /** NORMAL | MEDIO | CRITICO. */
  criticidad: string;
  requiereAceptacion: boolean;
  requiereEvidencia: boolean;
  evidenciaUrl: string | null;
  /** Solo registra información: no requiere seguimiento ni acción de ningún responsable. */
  esInformativo: boolean;
  vecesReprogramado: number;
  ultimoMotivoReprogramacion: string | null;
  /** Cómo se levantó el acuerdo (obligatorio si no tiene evidencia). */
  comentarioCumplimiento: string | null;
  responsables: ReunionAcuerdoResponsableDTO[];
}

export interface AcuerdoMarcarCumplidoRequest {
  comentario: string | null;
  /** URL del archivo ya subido (vía subirArchivos) a usar como evidencia de este acuerdo. */
  evidenciaUrl?: string | null;
}

/** Un acuerdo aún no cumplido de una edición anterior de la misma convocatoria recurrente. */
export interface AcuerdoPendienteAnteriorDTO {
  reunionAcuerdoId: number;
  reunionId: number;
  reunionNumero: number;
  reunionTema: string;
  descripcion: string;
  acciones: string | null;
  /** NORMAL | MEDIO | CRITICO. */
  criticidad: string;
  fechaProgramada: string | null;
  reunionAcuerdoEstadoId: number;
  reunionAcuerdoEstado: string;
  requiereEvidencia: boolean;
  evidenciaUrl: string | null;
  vecesReprogramado: number;
  ultimoMotivoReprogramacion: string | null;
  responsables: ReunionAcuerdoResponsableDTO[];
}

export interface AcuerdoReprogramarRequest {
  nuevaFechaProgramada: string;
  motivo: string;
}

export interface ReunionArchivoDTO {
  reunionArchivoId: number;
  archivoUrl: string;
  originalFileName: string | null;
  createdDateTime: string;
}

export interface ReunionReprogramacionDTO {
  reunionReprogramacionId: number;
  fechaAnterior: string;
  horaInicioAnterior: string | null;
  horaFinAnterior: string | null;
  fechaNueva: string;
  horaInicioNueva: string | null;
  horaFinNueva: string | null;
  motivo: string | null;
  createdDateTime: string;
  createdUserName: string | null;
}

export interface ReunionDetalleDTO {
  reunionId: number;
  projectId: number | null;
  projectDescription: string | null;
  areaScopeId: number | null;
  areaScopeDescripcion: string | null;
  numero: number;
  tema: string;
  convocadoPor: string | null;
  lugar: string | null;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  reunionEstadoId: number;
  reunionEstado: string;
  observaciones: string | null;
  createdUserId: number;
  /** true si el usuario autenticado es el creador del acta o uno de sus coautores. */
  puedeEditar: boolean;
  reunionAnteriorId: number | null;
  reunionAnteriorNumero: number | null;
  reunionAnteriorTema: string | null;
  reunionSiguienteId: number | null;
  reunionSiguienteNumero: number | null;
  reunionSiguienteTema: string | null;
  participantes: ReunionParticipanteDTO[];
  acuerdos: ReunionAcuerdoDTO[];
  archivos: ReunionArchivoDTO[];
  reprogramaciones: ReunionReprogramacionDTO[];
  acuerdoEstados: CatalogoDTO[];
  trabajadores: TrabajadorAbrilDTO[];
  /** Temas predefinidos para el desplegable al "Agendar siguiente reunión". */
  temas: ReunionTemaOpcionDTO[];
}

// ── Requests ───────────────────────────────────────────────────────────────
export interface ReunionParticipanteInput {
  reunionParticipanteId: number | null;
  /**
   * workers.id cuando el participante se eligió del desplegable de trabajadores de Abril.
   * Si el worker no tiene puesto, el cargo ingresado a mano se da de alta en el catálogo `puesto`.
   */
  workerId?: number | null;
  nombre: string;
  cargo: string | null;
  iniciales: string | null;
  asistio: boolean;
  /** Solo tiene efecto si workerId viene informado (un invitado externo no puede ser coautor). */
  esCoautor?: boolean;
}

export interface ReunionCreateRequest {
  /** Reunión de proyecto. Exactamente uno de projectId/areaScopeId, o ninguno (reunión de toda la organización). */
  projectId: number | null;
  /** Reunión de un nodo del árbol area_scope (gerencia/área/subárea). */
  areaScopeId: number | null;
  tema: string;
  /** Tema del catálogo elegido (null si es personalizado), para heredar su configuración de agenda/recordatorio. */
  reunionTemaId: number | null;
  convocadoPor: string | null;
  lugar: string | null;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  reunionAnteriorId: number | null;
  /** Agenda fija ad-hoc, obligatoria cuando la reunión es puntual (tema personalizado, no recurrente). */
  agendaTexto: string | null;
  participantes: ReunionParticipanteInput[];
}

export interface ReunionUpdateRequest {
  tema: string;
  convocadoPor: string | null;
  lugar: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  observaciones: string | null;
  participantes: ReunionParticipanteInput[];
}

export interface ReunionReprogramarRequest {
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  motivo: string | null;
}

export interface ReunionAcuerdoRequest {
  descripcion: string;
  acciones: string | null;
  fechaProgramada: string | null;
  fechaReprogramacion: string | null;
  fechaCumplimiento: string | null;
  reunionAcuerdoEstadoId: number | null;
  /** Si true, cada responsable debe aceptar el acuerdo antes de quedar activo. */
  requiereAceptacion: boolean;
  /** Si true, no se puede marcar CUMPLIDO sin adjuntar evidencia. */
  requiereEvidencia: boolean;
  evidenciaUrl: string | null;
  /** Si true, solo registra información: no requiere seguimiento ni acción de ningún responsable. */
  esInformativo: boolean;
  /** Ids de workers (cualquier trabajador de la organización, haya asistido o no). */
  responsableWorkerIds: number[];
  /** NORMAL | MEDIO | CRITICO. */
  criticidad: string;
  /** WorkerId del responsable principal cuando hay más de uno; null si solo hay uno o ninguno. */
  responsablePrincipalWorkerId: number | null;
}

// ── Carpeta de SharePoint para adjuntos ─────────────────────────────────────

/** Carpeta única (singleton) de SharePoint/OneDrive donde se guardan los adjuntos de las actas. */
export interface ReunionFolderDTO {
  reunionFolderId: number;
  linkUrl: string;
  driveId: string;
  folderId: string;
  folderName: string | null;
  webUrl: string | null;
  active: boolean;
  createdDateTime: string;
  createdUserId: number;
}

/** Una regla de convocatoria de un tema: a quién convocar (área/gerencia y/o proyecto + puestos).
 * Un tema puede tener varias reglas independientes (ej. jefaturas de una gerencia + un gerente
 * puntual de otra). */
export interface TemaConvocatoriaReglaDTO {
  areaScopeId: number | null;
  areaScopeDescripcion: string | null;
  projectId: number | null;
  projectDescription: string | null;
  puestoIds: number[];
  /** Workers del staff del proyecto excluidos a mano (solo aplica cuando projectId tiene valor). */
  workerIdsExcluidos: number[];
}

export interface TemaConvocatoriaReglaInput {
  areaScopeId: number | null;
  projectId: number | null;
  puestoIds: number[];
  workerIdsExcluidos: number[];
}

/** Convocatoria recurrente asociada a un tema (ej. "Reunión de Jefaturas de Proyectos"). */
export interface TemaConvocatoriaDTO {
  reglas: TemaConvocatoriaReglaDTO[];
  agendaFija: boolean;
  agendaTexto: string | null;
  recordatorioHorasAntes: number | null;
}

/** Configuración de recurrencia de un tema (generación automática de la siguiente reunión). */
export interface TemaRecurrenciaDTO {
  esRecurrente: boolean;
  recurrenciaActiva: boolean;
  areaScopeId: number | null;
  areaScopeDescripcion: string | null;
  intervaloDias: number | null;
  /** YYYY-MM-DD */
  fechaAncla: string | null;
  /** HH:mm */
  horaInicio: string | null;
  horaFin: string | null;
  lugar: string | null;
  diasAnticipacion: number;
  ultimaFechaGenerada: string | null;
  /** Informativo, calculado en el backend. */
  proximaFechaEstimada: string | null;
}

export interface TemaRecurrenciaSaveRequest {
  esRecurrente: boolean;
  recurrenciaActiva: boolean;
  areaScopeId: number | null;
  intervaloDias: number | null;
  fechaAncla: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  lugar: string | null;
  diasAnticipacion: number;
}

/** Info del acuerdo/responsable para la página de aceptar/rechazar (link del correo del acta). */
export interface AcuerdoResponsableInfoDTO {
  reunionAcuerdoResponsableId: number;
  reunionId: number;
  reunionNumero: number;
  reunionTema: string;
  acuerdoDescripcion: string;
  acuerdoAcciones: string | null;
  fechaProgramada: string | null;
  /** PENDIENTE | ACEPTADO | RECHAZADO */
  estadoAceptacion: string;
  motivoRechazo: string | null;
}

export interface AcuerdoResponsableDecisionRequest {
  aceptado: boolean;
  motivoRechazo: string | null;
}

export interface TemaConvocatoriaSaveRequest {
  reglas: TemaConvocatoriaReglaInput[];
  agendaFija: boolean;
  agendaTexto: string | null;
  recordatorioHorasAntes: number | null;
}

// ── Agenda de reunión ────────────────────────────────────────────────────────
export interface ReunionAgendaItemDTO {
  reunionAgendaItemId: number;
  workerId: number;
  workerNombre: string;
  /** Subárea (nodo area_scope) del trabajador, si tiene una asignada. */
  subareaDescripcion: string | null;
  descripcion: string;
  orden: number;
}

export interface ReunionAgendaDTO {
  requiereAgenda: boolean;
  agendaFija: boolean;
  agendaTexto: string | null;
  /** Temas por participante cuando agendaFija es false, o los "temas puntuales" agregados a
   *  mano para esta ocurrencia cuando agendaFija es true. */
  items: ReunionAgendaItemDTO[];
  participantesPendientes: string[];
  workerIdActual: number | null;
}

export interface ReunionAgendaItemInput {
  descripcion: string;
}

export interface GuardarMisTemasRequest {
  temas: ReunionAgendaItemInput[];
}

/** Un acuerdo del que el usuario autenticado es responsable, en cualquier reunión (dashboard personal). */
export interface MisAcuerdoDTO {
  reunionAcuerdoId: number;
  reunionAcuerdoResponsableId: number;
  reunionId: number;
  reunionNumero: number;
  reunionTema: string;
  ambito: string;
  descripcion: string;
  acciones: string | null;
  /** NORMAL | MEDIO | CRITICO. */
  criticidad: string;
  fechaProgramada: string | null;
  reunionAcuerdoEstadoId: number;
  reunionAcuerdoEstado: string;
  fechaCumplimiento: string | null;
  esPrincipal: boolean;
  otrosResponsables: string[];
  requiereEvidencia: boolean;
  evidenciaUrl: string | null;
  /** Cómo se levantó el acuerdo (obligatorio al marcar CUMPLIDO). */
  comentarioCumplimiento: string | null;
  requiereAceptacion: boolean;
  /** PENDIENTE | ACEPTADO | RECHAZADO. */
  estadoAceptacion: string;
}

// ── Vista global "Acuerdos" (todas las reuniones donde el usuario participó) ────────────────
export interface AcuerdoBusquedaItemDTO {
  reunionAcuerdoId: number;
  reunionId: number;
  reunionNumero: number;
  reunionTema: string;
  /** Proyecto, área o "Organización". */
  ambito: string;
  descripcion: string;
  /** NORMAL | MEDIO | CRITICO. */
  criticidad: string;
  fechaProgramada: string | null;
  fechaCumplimiento: string | null;
  reunionAcuerdoEstadoId: number;
  reunionAcuerdoEstado: string;
  esInformativo: boolean;
  requiereEvidencia: boolean;
  evidenciaUrl: string | null;
  /** Cómo se levantó el acuerdo (obligatorio al marcar CUMPLIDO). */
  comentarioCumplimiento: string | null;
  responsables: string[];
}

export interface AcuerdoBusquedaFiltro {
  /** PENDIENTE | EN PROCESO | CUMPLIDO | ANULADO | INFORMATIVO. */
  estado: string | null;
  responsableWorkerId: number | null;
  /** Filtra por fechaProgramada. */
  desde: string | null;
  hasta: string | null;
  texto: string | null;
  page: number;
  pageSize: number;
}

export interface ReunionFiltro {
  projectId: number | null;
  /** Nodo del árbol area_scope; incluye descendientes. */
  areaScopeId: number | null;
  reunionEstadoId: number | null;
  desde: string | null;
  hasta: string | null;
  page: number;
  pageSize: number;
}
