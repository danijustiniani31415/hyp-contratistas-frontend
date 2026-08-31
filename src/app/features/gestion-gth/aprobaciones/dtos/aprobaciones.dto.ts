import { SolicitudDestinatarios } from '../../shared/dtos/destinatarios.dto';

/**
 * Nivel con el que el usuario entra a «Aprobaciones». Lo resuelve el backend desde la CATEGORÍA de
 * su ficha de trabajador, no desde su rol: el rol solo abre la pantalla.
 *
 * - `GERENTE_GENERAL`: ve todas las solicitudes y decide las vacantes NUEVAS. Su firma
 *   sola las manda a Gestión de Talento Humano.
 * - `GERENTE_AREA`: ve las de su área hacia abajo y decide las de REEMPLAZO. Firma PRIMERO: su
 *   visto bueno es lo que le pasa la vacante a GTH, y su rechazo la cierra ahí mismo.
 * - `GTH`: cualquier trabajador del área de Gestión del Talento Humano. Pone la SEGUNDA firma de
 *   los reemplazos, de toda la empresa. Solo le aparecen los que el gerente del área ya aprobó.
 * - `NINGUNO`: entra a la pantalla, pero no hay solicitudes bajo su alcance.
 */
export type AprobacionNivel = 'GERENTE_GENERAL' | 'GERENTE_AREA' | 'GTH' | 'NINGUNO';

/**
 * Por dónde se aprueba una vacante. Lo deriva el backend del tipo de requerimiento y del flag FFT:
 * - `GG`: solo Gerencia General (las vacantes nuevas que no son un ingreso directo).
 * - `AREA_GTH`: el gerente del área Y GTH, las dos firmas y en ese orden (los reemplazos que no
 *   son FFT). GTH no ve la vacante hasta que el gerente del área la aprueba.
 * - `NINGUNA`: el ingreso directo FFT, que no firma nadie. No llega a esta pantalla —el backend
 *   recorta esas vacantes— pero está en el tipo porque es una de las rutas del flujo.
 */
export type RutaAprobacion = 'GG' | 'AREA_GTH' | 'NINGUNA';

/**
 * Una de las dos casillas de decisión de la solicitud (gerente del área o Gerencia General). Las
 * dos tienen la misma forma para poder pintarlas con el mismo bloque de plantilla.
 */
export interface AprobacionNivelResumen {
  /** PENDIENTE / APROBADA / APROBADA_PARCIAL / RECHAZADA. */
  estadoCodigo: string;
  estadoNombre: string;
  /** true cuando ese nivel ya decidió. */
  decidida: boolean;
  /** Momento de la decisión (ISO, hora Perú). */
  decididoEn: string | null;
  /** Quién decidió (null si sigue pendiente o si es anterior a esta pantalla). */
  decididoPor: string | null;
  comentario: string | null;
  vacantesAprobadas: number;
  vacantesRechazadas: number;
}

/** Una vacante de la solicitud, con la decisión de cada nivel. */
export interface AprobacionVacante {
  requerimientoId: number;
  codigo: string;
  puesto: string;
  /** Tipo de requerimiento (Nuevo / Reemplazo). */
  tipoRequerimiento: string;
  /**
   * Trabajador al que reemplaza la vacante: es lo que le da sentido a un Reemplazo a la hora de
   * aprobarlo. Null en las vacantes nuevas y en las anteriores a este dato.
   */
  trabajadorReemplazado: string | null;
  proyectoObra: string | null;
  /**
   * Salario bruto mensual declarado para la vacante, en soles: es parte de lo que se está
   * aprobando. Null en los REEMPLAZOS —que ya no lo declaran— y en las vacantes anteriores a que
   * se pidiera el dato; en los dos casos no se muestra nada.
   */
  salarioBrutoMensual: number | null;
  /**
   * true = ingreso directo **FFT**: la vacante no se publica ni arma long list, el candidato ya
   * viene con nombre. Lo que se aprueba es a esa persona, así que la fila lo tiene que decir.
   */
  esFft: boolean;
  /** Nombre del candidato FFT que nombró el solicitante. Null en las vacantes normales. */
  fftCandidatoNombre: string | null;
  /**
   * Número de documento del candidato FFT: es lo único que lo identifica sin ambigüedad (dos
   * candidatos pueden llamarse igual) y con lo que ya quedó registrado en la base maestra. Null en
   * las vacantes normales y en los FFT anteriores a que se pidiera el dato.
   */
  fftCandidatoDocumento: string | null;
  /** Nombre del tipo de ese documento (DNI / CE). Null cuando no lo hay. */
  fftTipoDocumento: string | null;
  /** El documento con su tipo, listo para mostrar: «DNI 12345678». Lo arma el backend. */
  fftDocumentoTexto: string | null;
  /** Correo personal del candidato FFT. Null en las vacantes normales. */
  fftCandidatoCorreo: string | null;
  /** Código estable del tipo (`NUEVO` / `REEMPLAZO`): es lo que decide la `ruta`. */
  tipoRequerimientoCodigo: string;
  /** Por dónde se aprueba esta vacante. El modal solo deja marcar las de la ruta del usuario. */
  ruta: RutaAprobacion;
  /** Decisión del gerente del área: true / false / null = sin decidir. */
  aprobadoGerenteArea: boolean | null;
  /** Decisión de Gerencia General: true = aprobada, false = rechazada, null = sin decidir. */
  aprobadoGerenteGeneral: boolean | null;
  /** Decisión de GTH: true / false / null = sin decidir. Solo aplica en la ruta `AREA_GTH`. */
  aprobadoGth: boolean | null;
}

/** Detalle de una aprobación: cabecera de la solicitud, sus vacantes y las dos casillas. */
export interface AprobacionDetalle {
  aprobacionId: number;
  area: string | null;
  solicitanteNombre: string | null;
  justificacion: string | null;
  sustentoNombre: string | null;
  sustentoUrl: string | null;
  /** Fecha de registro de la solicitud (ISO, ya en hora Perú). */
  enviado: string;
  /** Decisión del gerente del área (una de las dos firmas de los reemplazos). */
  gerenteArea: AprobacionNivelResumen;
  /** Decisión de Gerencia General (la que mueve las vacantes nuevas). */
  gerenteGeneral: AprobacionNivelResumen;
  /** Decisión de GTH (la otra firma de los reemplazos). */
  gth: AprobacionNivelResumen;
  /**
   * Qué firmas necesita ESTA solicitud, derivadas de los tipos de sus vacantes. La pantalla pinta
   * solo las casillas que hacen falta en vez de mostrar tres siempre, dos de ellas eternamente
   * pendientes sin que nadie las vaya a tocar.
   */
  requiereGerenteGeneral: boolean;
  requiereGerenteArea: boolean;
  requiereGth: boolean;
  /** Con qué poder entra el usuario que abrió el modal. */
  nivel: AprobacionNivel;
  /** true si todavía puede registrar SU decisión; false ⇒ el modal abre en lectura. */
  puedeDecidir: boolean;
  vacantes: AprobacionVacante[];
  /**
   * A quién le llegarán los correos que dispara ESTA decisión al confirmar, según el nivel de quien
   * abre: los de Gerencia General (el aviso a GTH y el de vacantes aprobadas a TI), el que le pide
   * a GTH la segunda firma del reemplazo (decisión del gerente del área) o el de reemplazos
   * aprobados más el de TI (decisión de GTH). Los resuelve el backend con la misma lógica del
   * envío, así que el aviso del modal no puede divergir de los correos que salen. Null en lectura o
   * si no se pudieron resolver.
   *
   * Que estén resueltos no significa que el correo vaya a salir: rechazarlo todo no manda nada, y
   * el modal lo dice en vez de prometer un envío que no ocurre (`sinEnvio`).
   */
  destinatarios: SolicitudDestinatarios | null;
}

/** Una solicitud en la lista de «Aprobaciones» (una fila = una solicitud de personal). */
export interface AprobacionListItem {
  aprobacionId: number;
  /**
   * Códigos de las vacantes que este usuario ve —las de su ruta—, separados por ", ". Una solicitud
   * mixta se lee distinto según quién pregunte: el Gerente General ve solo las nuevas.
   */
  codigos: string;
  area: string | null;
  solicitanteNombre: string | null;
  justificacion: string | null;
  /** Fecha de registro de la solicitud (ISO, hora Perú). */
  enviado: string;
  /**
   * Cuántas vacantes de esta solicitud le tocan al usuario. NO es el total de la solicitud: el
   * backend no manda las de la otra ruta. El total real lo ve el solicitante en su seguimiento.
   */
  totalVacantes: number;
  gerenteArea: AprobacionNivelResumen;
  gerenteGeneral: AprobacionNivelResumen;
  gth: AprobacionNivelResumen;
  /**
   * Qué firmas necesita lo que este usuario ve. La casilla de la otra ruta llega siempre en false,
   * así que `casillas()` no la pinta.
   */
  requiereGerenteGeneral: boolean;
  requiereGerenteArea: boolean;
  requiereGth: boolean;
  /** true si esta fila espera la decisión del usuario que consulta. */
  esperaMiDecision: boolean;
}

/**
 * Contadores de las tarjetas. El backend los calcula SIEMPRE contra la casilla del usuario que
 * consulta: "por aprobar" es lo que espera SU firma, no la del otro nivel.
 */
export interface AprobacionesResumen {
  pendientes: number;
  vacantesPendientes: number;
  aprobadas: number;
  rechazadas: number;
}

/** Pantalla completa en una sola petición. */
export interface AprobacionesPanel {
  nivel: AprobacionNivel;
  /** Área de la que el usuario es gerente (solo con nivel GERENTE_AREA). */
  areaAlcance: string | null;
  resumen: AprobacionesResumen;
  aprobaciones: AprobacionListItem[];
}

/** Decisión sobre una vacante concreta. */
export interface VacanteDecision {
  requerimientoId: number;
  aprobado: boolean;
}

/**
 * Payload de la decisión. El nivel NO viaja acá: lo resuelve el backend desde la categoría del
 * usuario, para que nadie pueda pedir que su firma cuente como la del Gerente General.
 */
export interface AprobacionDecision {
  decisiones: VacanteDecision[];
  comentario: string | null;
}

/**
 * Decisión en bloque desde la lista: se aprueban (o rechazan) TODAS las vacantes de cada solicitud
 * seleccionada. El nivel con el que se registra tampoco viaja acá — lo resuelve el backend desde la
 * categoría de la ficha del usuario, así que la pantalla no puede pedir firmar como Gerencia General.
 */
export interface AprobacionDecisionMasiva {
  /** Solicitudes seleccionadas. */
  aprobacionIds: number[];
  /** true = aprobar todas sus vacantes; false = rechazarlas todas. */
  aprobado: boolean;
  /** Comentario opcional; queda igual en todas las solicitudes del lote. */
  comentario: string | null;
}

/**
 * Solicitud que quedó fuera del lote y por qué (ya la decidió alguien más de su mismo nivel, se dio
 * de baja, quedó fuera de alcance). No es un error: se muestran para que el conteo no quede sin
 * explicación.
 */
export interface AprobacionDecisionOmitida {
  aprobacionId: number;
  motivo: string;
}

/** Resultado de una decisión en bloque. */
export interface AprobacionDecisionMasivaResult {
  message: string;
  /** Nivel con el que se registró (GERENTE_GENERAL / GERENTE_AREA). */
  nivel: AprobacionNivel;
  /** Eco de lo pedido: true si el lote se aprobó, false si se rechazó. */
  aprobado: boolean;
  /** Solicitudes en las que la decisión quedó registrada. */
  solicitudes: number;
  /** Vacantes decididas en total. */
  vacantes: number;
  omitidas: AprobacionDecisionOmitida[];
}

/** Resultado de registrar la decisión. */
export interface AprobacionDecisionResult {
  message: string;
  /** Nivel con el que se registró (GERENTE_GENERAL / GERENTE_AREA). */
  nivel: AprobacionNivel;
  estadoCodigo: string;
  estadoNombre: string;
  aprobados: number;
  rechazados: number;
}
