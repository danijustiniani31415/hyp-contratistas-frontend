import { SolicitudDestinatarios } from '../../shared/dtos/destinatarios.dto';
import { CandidatoRechazado } from '../../shared/dtos/candidato-rechazado.dto';
import { Seleccionado } from '../../shared/dtos/seleccionado.dto';

export interface OpcionDto {
  id: number;
  nombre: string;
}

/**
 * Opción del desplegable "Tipo de requerimiento". Trae además el código estable del catálogo
 * porque el formulario cambia de forma según el tipo: al elegir Reemplazo aparece el desplegable
 * del trabajador reemplazado. Se compara por `codigo` y nunca por `nombre`, que es presentación.
 */
export interface TipoRequerimientoOpcion extends OpcionDto {
  /** `NUEVO` | `REEMPLAZO`. */
  codigo: string;
}

/**
 * Código del tipo de requerimiento que obliga a decir a quién se reemplaza. Es también el que
 * NO pide sueldo: el puesto que se cubre ya existe con su banda, así que el formulario no lo
 * muestra y el backend descarta lo que llegue.
 */
export const TIPO_REQUERIMIENTO_REEMPLAZO = 'REEMPLAZO';

/**
 * Opción del desplegable «Tipo de documento» del candidato de un ingreso directo (FFT). El
 * `codigo` estable es lo que decide cuántos dígitos admite el número, así que se compara por él
 * y nunca por el nombre.
 */
export interface TipoDocumentoOpcion extends OpcionDto {
  /** `DNI` | `CE`. */
  codigo: string;
}

/** Código del tipo de documento que se ofrece por defecto. */
export const TIPO_DOCUMENTO_DNI = 'DNI';

/**
 * Cuántos dígitos admite el documento según su tipo. Es la misma regla que aplica el backend
 * (`FftDocumento`): el DNI son 8 exactos y el carné de extranjería, entre 8 y 12. Un tipo que se
 * agregue al catálogo sin regla propia entra por el caso amplio, igual que allá.
 */
export function largoDocumento(codigo: string | null | undefined): { min: number; max: number } {
  return codigo?.trim().toUpperCase() === TIPO_DOCUMENTO_DNI ? { min: 8, max: 8 } : { min: 8, max: 12 };
}

/**
 * Ítem del desplegable «Puesto». Trae el área a la que entra quien ocupe el puesto: el
 * solicitante ya no elige área, la decide el puesto que pide. `null` = el puesto no tiene
 * destino (los de obra) y el contratado entra al área del propio solicitante.
 */
export interface PuestoOpcion extends OpcionDto {
  areaDestino: string | null;
}

/** Datos del formulario "Nueva solicitud de personal" en una sola petición. */
export interface ReclutamientoFormDataDto {
  areaNombre: string | null;
  areaScopeId: number | null;
  /**
   * Puesto del propio solicitante, para el campo de solo lectura «Tu puesto». Sale de
   * `workers.puesto_id → puesto.nombre`. null cuando el usuario no tiene ficha de trabajador o
   * su ficha todavía no tiene puesto.
   */
  puestoNombre: string | null;
  /**
   * Categoría del propio solicitante, para el campo de solo lectura «Tu categoría». No se guarda
   * en la ficha: se llega por el puesto (`puesto.categoria_id`), así que sin puesto tampoco hay
   * categoría.
   */
  categoriaNombre: string | null;
  maxVacantes: number;
  puestos: PuestoOpcion[];
  tiposRequerimiento: TipoRequerimientoOpcion[];
  proyectos: OpcionDto[];
  /**
   * Tipos de documento del candidato de un ingreso directo (DNI / CE), del mismo catálogo que usa
   * el formulario del postulante.
   */
  tiposDocumento: TipoDocumentoOpcion[];
  /**
   * Trabajadores entre los que se elige al reemplazado: los del área del solicitante y los de
   * cualquier área hija, incluido él mismo (pedir el reemplazo propio por renuncia o promoción es
   * un caso real). Solo los que trabajan en Abril hoy — el backend descarta a los retirados y a
   * las fichas de pre-ingreso de Reclutamiento. Vacía cuando el solicitante no tiene área
   * registrada: en ese caso no hay de dónde elegir y el campo deja de ser obligatorio.
   */
  trabajadoresArea: OpcionDto[];
  destinatarios: SolicitudDestinatarios;
  /**
   * A quién le llegaría el aviso a GTH de una vacante de ingreso directo **FFT**. A un ingreso
   * directo no lo aprueba nadie —lo pida quien lo pida— así que su aviso reemplaza a
   * `destinatarios` en esas vacantes, y una solicitud que mezcle las dos clases manda los dos
   * correos.
   */
  destinatariosFft: SolicitudDestinatarios | null;
}

export interface VacanteCreateDto {
  /**
   * Puesto del catálogo: es el único origen posible. El solicitante no puede dar de alta puestos
   * nuevos desde este formulario — eso lo hace GTH en el catálogo de puestos.
   */
  puestoId: number | null;
  tipoRequerimientoId: number | null;
  /**
   * Trabajador al que reemplaza la vacante. Solo se envía en las de tipo Reemplazo (en las demás
   * va null); el backend revalida contra la misma lista que ofreció el formulario — área del
   * solicitante o hija, y trabajando hoy.
   */
  reemplazaWorkerId: number | null;
  projectId: number | null;
  /**
   * Salario bruto mensual de la vacante, en soles. Obligatorio en las vacantes NUEVAS —es parte de
   * lo que aprueba Gerencia General y va en sus correos— y null en los REEMPLAZOS, donde el
   * formulario ni siquiera lo pide.
   */
  salarioBrutoMensual: number | null;
  /**
   * true = ingreso directo **FFT**: el solicitante ya sabe a quién quiere, así que la vacante
   * obliga a declarar nombre y correo personal del candidato y el proceso se salta publicación,
   * revisión de CV, long list, entrevistas y finalistas.
   */
  esFft: boolean;
  /** Nombre completo del candidato FFT. Obligatorio cuando `esFft`; null en el resto. */
  fftCandidatoNombre: string | null;
  /** Tipo de documento del candidato FFT (`gth_tipo_documento`). Obligatorio cuando `esFft`. */
  fftTipoDocumentoId: number | null;
  /**
   * Número de documento del candidato FFT; el largo lo decide su tipo (ver `largoDocumento`).
   * Obligatorio cuando `esFft`: es la llave con la que el candidato entra a `person` apenas se
   * registra la solicitud.
   */
  fftCandidatoDocumento: string | null;
  /** Correo personal del candidato FFT. */
  fftCandidatoCorreo: string | null;
}

export interface SolicitudPersonalCreateDto {
  /**
   * Justificación general de la solicitud. Obligatoria: es el sustento que leen el gerente del área
   * y Gerencia General para aprobar, y va en el cuerpo de sus correos.
   */
  justificacion: string;
  vacantes: VacanteCreateDto[];
}

export interface SolicitudPersonalCreateResult {
  id: number;
  codigos: string[];
  /**
   * ¿Salió TODO lo que tenía que salir? Las vacantes normales disparan el correo de aprobación y
   * las de ingreso directo el aviso a GTH; una solicitud mixta manda los dos y esto es true solo si
   * salieron ambos. false cuando no hay destinatarios configurados o el envío falló: la solicitud
   * queda esperando un reenvío.
   */
  correoGerenciaEnviado: boolean;
  /**
   * true = la solicitud no pasa por «Aprobaciones» porque TODAS sus vacantes son de ingreso directo
   * FFT: los requerimientos nacen ya en manos de GTH esperando el EMO de ingreso.
   */
  aprobacionGgOmitida: boolean;
  /** true si la solicitud trae al menos una vacante de ingreso directo FFT. */
  hayIngresoDirecto: boolean;
  message: string;
}

/** Resultado de reenviar el correo de aprobación a Gerencia General. */
export interface AprobacionGgReenvioResult {
  message: string;
  /** Destinatarios principales a los que se envió (para mostrarlos en el mensaje). */
  destinatarios: string[];
}

/** Una fase del pipeline dentro del seguimiento vertical del requerimiento. */
export interface FaseSeguimiento {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  /** Estado visual respecto a la fase actual: 'done' | 'current' | 'pending'. */
  estado: 'done' | 'current' | 'pending';
}

/**
 * Aprobación de la solicitud (primer paso del flujo), en sus dos niveles: el visto bueno del
 * gerente del área y la aprobación de Gerencia General, que es la obligatoria y la que manda las
 * vacantes a GTH. Null en los requerimientos anteriores a esa funcionalidad, que no pasaron por
 * ese paso.
 */
export interface AprobacionGgResumen {
  /** PENDIENTE / APROBADA / APROBADA_PARCIAL / RECHAZADA (decisión del GG sobre la solicitud). */
  estadoCodigo: string;
  estadoNombre: string;
  /** Decisión del GG sobre ESTA vacante: true = aprobada, false = rechazada, null = sin decidir. */
  aprobado: boolean | null;
  /** Estado del visto bueno del gerente del área sobre la solicitud completa. */
  gerenteAreaEstadoCodigo: string;
  gerenteAreaEstadoNombre: string;
  /** Visto bueno del gerente del área sobre ESTA vacante: true / false / null = no opinó. */
  aprobadoGerenteArea: boolean | null;
  /** Envío del correo a los gerentes (ISO, hora Perú). Null si nunca se pudo enviar. */
  enviadoEn: string | null;
  /** Momento de la decisión del GG (ISO, hora Perú). Null si sigue pendiente. */
  decididoEn: string | null;
  /** Momento del visto bueno del gerente del área (ISO, hora Perú). */
  gerenteAreaDecididoEn: string | null;
  /** Comentario del Gerente General. */
  comentario: string | null;
  /** Comentario del gerente del área. */
  gerenteAreaComentario: string | null;
  /** Estado de la decisión de GTH sobre la solicitud (solo cuenta en los reemplazos). */
  gthEstadoCodigo: string;
  gthEstadoNombre: string;
  /** Decisión de GTH sobre ESTA vacante: true / false / null = sin decidir. */
  aprobadoGth: boolean | null;
  /** Momento de la decisión de GTH (ISO, hora Perú). */
  gthDecididoEn: string | null;
  /** Comentario de GTH. */
  gthComentario: string | null;
  /**
   * Por dónde se aprueba esta vacante: `GG` (solo Gerencia General, las nuevas) o `AREA_GTH`
   * (gerente del área + GTH, los reemplazos). Con esto la tarjeta muestra solo las firmas que hacen
   * falta en vez de las tres. Un ingreso directo FFT no tiene aprobación: en esos la tarjeta llega
   * en null y no hay `ruta` que mirar.
   */
  ruta: 'GG' | 'AREA_GTH';
}

/** Detalle de seguimiento de un requerimiento (modal "Estado del reclutamiento"). */
export interface Seguimiento {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  tipoRequerimiento: string;
  /**
   * true = ingreso directo **FFT**. `fases` ya viene sin los pasos que este flujo no recorre; esto
   * es para poder explicar en pantalla por qué el proceso es más corto.
   */
  esFft: boolean;
  /** Nombre del candidato FFT que nombró el solicitante. Null cuando no es FFT. */
  fftCandidatoNombre: string | null;
  area: string | null;
  proyectoObra: string | null;
  justificacion: string | null;
  /**
   * Salario bruto mensual declarado para la vacante, en soles. Null en los requerimientos
   * anteriores a que se pidiera el dato.
   */
  salarioBrutoMensual: number | null;
  /** Fecha de envío (ISO, ya en hora Perú). */
  enviado: string;
  estadoCodigo: string;
  estadoNombre: string;
  estadoOrden: number;
  /** Aprobación de Gerencia General de la solicitud (null en requerimientos previos a ese paso). */
  aprobacionGg: AprobacionGgResumen | null;
  sustentoNombre: string | null;
  sustentoUrl: string | null;
  fases: FaseSeguimiento[];
  /**
   * Candidatos rechazados a lo largo del proceso (los que rechazó el solicitante y los que
   * descartó GTH), con la etapa del rechazo. Incluye las long lists anteriores.
   */
  candidatosRechazados: CandidatoRechazado[];
  /**
   * Quién obtuvo el puesto (la decisión final que tomó el propio solicitante). Null mientras el
   * proceso no se haya cerrado con un seleccionado.
   */
  seleccionado: Seleccionado | null;
  /** Descripción de la fase actual (siguiente acción pendiente). */
  siguientePaso: string | null;
}

/** Fila de la tabla "Mis solicitudes de vacante" (un requerimiento del usuario). */
export interface SolicitudVacanteListItem {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  justificacion: string | null;
  area: string | null;
  proyectoObra: string | null;
  /** Fecha de envío (ISO, ya en hora Perú). */
  enviado: string;
  estadoCodigo: string;
  estadoNombre: string;
  /**
   * Quién registró la solicitud. La tabla muestra los requerimientos de toda el área, así que la
   * fila tiene que decir de quién es el pedido. Null si ese usuario no tiene ficha de trabajador.
   */
  solicitante: string | null;
}

/**
 * Tarjeta de "Gestión de candidatos": un requerimiento sobre el que GTH le dejó algo por
 * revisar al solicitante. Hay dos tipos, distinguidos por `tipo`: la long list enviada
 * (con decisión de aprobar/rechazar) y el informe de finalistas (solo lectura).
 */
export interface GestionCandidatoCard {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  area: string | null;
  proyectoObra: string | null;
  /** Cantidad de candidatos de la tarjeta (long list cargada o finalistas evaluados). */
  totalCandidatos: number;
  estadoCodigo: string;
  estadoNombre: string;
  /** 'LONG_LIST' = CVs por decidir; 'FINALISTAS' = informe de entrevistas de GTH. */
  tipo: 'LONG_LIST' | 'FINALISTAS';
}

/**
 * Contadores de las tarjetas resumen de la cabecera (el embudo del solicitante). Los calcula el
 * backend: qué fase le toca a quién es regla de negocio del pipeline, no del componente.
 */
export interface ResumenSolicitantePanel {
  /** "Mis solicitudes · Total registradas". */
  totalRegistradas: number;
  /** "Pendientes · Sin respuesta": siguen en la fase inicial, GTH todavía no los tomó. */
  pendientes: number;
  /** "En revisión · GTH evaluando": el siguiente paso le toca a GTH (sin contar el inicial). */
  enRevisionGth: number;
  /** "Aprobadas · Este período": procesos cerrados (finalista aprobado) del año en curso. */
  aprobadas: number;
}

/** Panel de la vista del solicitante: resumen + tarjetas de gestión de candidatos + tabla. */
export interface SolicitantePanel {
  resumen: ResumenSolicitantePanel;
  gestionCandidatos: GestionCandidatoCard[];
  misSolicitudes: SolicitudVacanteListItem[];
  /**
   * ¿El usuario puede mover estos requerimientos (registrar una solicitud, decidir la long list,
   * decidir al finalista, reenviar la aprobación)? Lo decide el backend por la categoría de su
   * puesto: solo JEFE, GERENTE y GERENTE GENERAL. Con `false` la pantalla es de consulta y no se
   * muestran los botones de acción — el backend igual los rechaza.
   */
  puedeGestionar: boolean;
}

/** Un candidato de la long list como lo revisa el solicitante (modal "Revisar long list y CVs"). */
export interface CandidatoRevision {
  candidatoId: number;
  nombre: string;
  /** Puesto del requerimiento (el que registró el solicitante), no un dato por candidato. */
  puesto: string | null;
  comentario: string | null;
  /** Nombre y link del CV en SharePoint (para "Ver CV completo"). */
  cvNombre: string | null;
  cvUrl: string | null;
  /** Portafolio/anexos que GTH adjuntó además del CV (vacío si no cargó ninguno). */
  anexos: CandidatoAnexo[];
  /** Estado de revisión (PENDIENTE / APROBADO / RECHAZADO). */
  estadoCodigo: string;
  estadoNombre: string;
}

/** Un archivo del "Portafolio/Anexos" de un candidato de la long list. */
export interface CandidatoAnexo {
  anexoId: number;
  /** Nombre con el que GTH lo subió. */
  nombre: string;
  /** Link al archivo en SharePoint. Null si la subida no dejó url. */
  url: string | null;
}

/** Decisión del solicitante por candidato (aprobar/rechazar) que se envía a GTH. */
export interface CandidatoDecision {
  candidatoId: number;
  aprobado: boolean;
}

/** Resultado de registrar la decisión de la long list. */
export interface LongListDecisionResult {
  message: string;
  estadoCodigo: string;
  estadoNombre: string;
  aprobados: number;
  rechazados: number;
  /** true si el solicitante rechazó a todos los candidatos (0 aprobados). */
  todosRechazados: boolean;
}

/** Revisión de la long list de un requerimiento: cabecera + candidatos. */
export interface RevisionLongList {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  area: string | null;
  proyectoObra: string | null;
  estadoCodigo: string;
  estadoNombre: string;
  candidatos: CandidatoRevision[];
}

/** Evaluación que GTH registró tras la entrevista de un finalista. */
export interface EvaluacionFinalista {
  /** Resultado de la entrevista (qué se observó). */
  comentarioEntrevista: string | null;
  /** Informe psicotécnico del candidato. */
  comentarioPsicotecnico: string | null;
  /** Recomendación de GTH al área solicitante. */
  comentarioRecomendacion: string | null;
  /**
   * Resultado del candidato en el proceso: 'PENDIENTE' | 'PASO' (finalista en carrera) |
   * 'NO_PASO' (descartado por GTH) | 'SELECCIONADO' | 'RECHAZADO' (decisión del solicitante).
   */
  resultadoCodigo: string;
  resultadoNombre: string;
  agradecimientoCorreo: string | null;
  agradecimientoEnviadoEn: string | null;
  /** Momento de la decisión final del solicitante (ISO, hora Perú). Null si aún no decidió. */
  decididoEn: string | null;
  /**
   * Archivos que GTH adjuntó al informe (informe final y resultados de la evaluación de
   * conocimientos). Vacío si no subió ninguno: los dos son opcionales.
   */
  archivos: ArchivoInformeFinalista[];
}

/** Un archivo del informe del finalista, para abrirlo desde SharePoint. */
export interface ArchivoInformeFinalista {
  archivoId: number;
  /** Código del documento: 'INFORME_FINAL' | 'EVALUACION_CONOCIMIENTOS'. */
  tipoCodigo: string;
  /** Nombre visible del documento ("Informe final"). */
  tipoNombre: string;
  /** Nombre del archivo tal como lo subió GTH. */
  nombre: string;
  url: string | null;
}

/** Un finalista con el informe que GTH registró tras su entrevista. */
export interface Finalista {
  candidatoId: number;
  nombre: string;
  /** Puesto del requerimiento (el que registró el solicitante), no un dato por candidato. */
  puesto: string | null;
  /** Nombre y link del CV que cargó GTH en la long list (para "Ver CV completo"). */
  cvNombre: string | null;
  cvUrl: string | null;
  /**
   * Nombre y link del CV documentado que el propio postulante adjuntó en su formulario. null si
   * no llegó a subirlo. Se muestra junto al de GTH: la decisión final se toma viendo los dos.
   */
  cvPostulanteNombre: string | null;
  cvPostulanteUrl: string | null;
  evaluacion: EvaluacionFinalista;
}

/** Informe de finalistas de un requerimiento (modal "Finalistas enviados por GTH"). */
export interface RevisionFinalistas {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  area: string | null;
  proyectoObra: string | null;
  estadoCodigo: string;
  estadoNombre: string;
  /** Finalistas ordenados alfabéticamente por nombre. */
  finalistas: Finalista[];
  /**
   * Área a la que entra el seleccionado: la de destino del puesto del requerimiento. Define el
   * área de su ficha de pre-ingreso, con la que se resuelve su jefatura al programarle el EMO
   * de ingreso.
   *
   * Es informativa — no se elige. `null` cuando el puesto no tiene destino (los de obra): el
   * backend se cae al área del solicitante.
   *
   * El nombre es el del nodo, no la rama completa ("Unidad de Proyectos", no
   * "Gerencia de Proyectos › Unidad de Proyectos").
   */
  areaDestino: OpcionDto | null;
}

/**
 * Decisión final del solicitante sobre un finalista. El área a la que entra el seleccionado no
 * viaja: la decide el puesto que se pidió y la resuelve el backend.
 */
export interface FinalistaDecision {
  candidatoId: number;
  /** true = aprobar (el proceso pasa a EMO de ingreso); false = rechazar al finalista. */
  aprobado: boolean;
}

/** Resultado de registrar la decisión final sobre un finalista. */
export interface FinalistaDecisionResult {
  message: string;
  /** Estado en el que quedó el requerimiento tras la decisión. */
  estadoCodigo: string;
  estadoNombre: string;
  aprobado: boolean;
  /** true si ya no queda ningún finalista: el requerimiento vuelve a Long list / CVs. */
  todosRechazados: boolean;
  candidatoNombre: string;
  /**
   * Ficha de pre-ingreso creada en workers para el seleccionado. Es el id con el que GTH abre
   * la programación de su EMO de Ingreso. Null al rechazar, o si el candidato todavía no tiene
   * el formulario del postulante aprobado.
   */
  workerId?: number | null;
}
