/**
 * DTOs del formulario del postulante en la vista de GTH (envío + revisión). El postulante lo llena
 * desde la página pública; aquí GTH lo envía, lo revisa y lo aprueba/rechaza.
 */

/** Estado del formulario de un candidato tal como se muestra en la bandeja de GTH. */
export interface CandidatoFormularioResumen {
  /** null si GTH aún no envió el enlace. Si no: ENVIADO / COMPLETADO / APROBADO / RECHAZADO. */
  estadoCodigo: string | null;
  estadoNombre: string | null;
  correoEnvio: string | null;
  enviadoEn: string | null;
  completadoEn: string | null;
  revisadoNombre: string | null;
  revisadoEn: string | null;
}

/** Datos declarados por el postulante, ya resueltos a nombre (para el modal de revisión de GTH). */
export interface FormularioDatos {
  // Página 0
  consentimientoDatosPersonales: boolean | null;
  // Página 1
  nombresCompletos: string | null;
  fechaNacimiento: string | null;
  estadoCivil: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  distrito: string | null;
  correoElectronico: string | null;
  numeroCelular: string | null;
  pretensionesSalariales: string | null;
  disponibilidad: string | null;
  linkedin: string | null;
  portafolioLink: string | null;
  // Página 2
  profesion: string | null;
  universidad: string | null;
  gradoAcademico: string | null;
  numeroColegiatura: string | null;
  // Página 3
  empresa: string | null;
  areaTrabajo: string | null;
  cargo: string | null;
  fechaInicio: string | null;
  fechaTermino: string | null;
  motivoCese: string | null;
  funcionesPrincipales: string | null;
  logros: string | null;
  ingresoBrutoMensual: string | null;
  personasACargo: number | null;
  jefeInmediato: string | null;
  autorizaVerificacionReferencias: boolean | null;
  // Página 4
  declaracionVeracidad: boolean | null;
  confirmacionDocumentos: boolean | null;
}

/**
 * Severidad de la coincidencia del documento declarado con la base (espejo de
 * `NivelCoincidenciaPersona` del backend). Solo `TRABAJADOR_ACTUAL` bloquea la aprobación.
 */
export type NivelCoincidencia = 'SOLO_PERSON' | 'FICHA_PREVIA' | 'TRABAJADOR_ACTUAL';

/**
 * El documento que el postulante declaró ya existe en la base: aprobar su formulario actualizaría
 * esa ficha de `person` en vez de crear una nueva.
 *
 * Es información **solo para GTH**. El postulante nunca sabe que lo que envió coincide con alguien
 * ya registrado: no es una regla de negocio suya y decírselo sería filtrar quién está en la base.
 * Por eso este dato no existe en la página pública del formulario.
 */
export interface FormularioCoincidencia {
  /** Documento declarado que coincide, normalizado. */
  documento: string;
  /** Tipo de documento que declaró el postulante (DNI / CE). Null si no lo eligió. */
  tipoDocumento: string | null;
  personId: number;
  /** Nombre con el que esa persona ya está registrada, para compararlo con el declarado. */
  nombreEnBd: string | null;
  /** Ficha de workers de esa persona (la que está adentro si hay; si no, la más reciente). */
  workerId: number | null;
  /** Código del estado de esa ficha (ACTIVO, RETIRADO…). Null si nunca tuvo ficha. */
  workersEstadoCodigo: string | null;
  /** Nombre visible del estado de esa ficha. Null si nunca tuvo ficha. */
  workersEstadoNombre: string | null;
  /** true si alguna de sus fichas está adentro de la empresa hoy. */
  estaAdentro: boolean;
  nivel: NivelCoincidencia;
  /** true si esta coincidencia impide aprobar. El backend lo vuelve a validar al decidir. */
  bloqueaAprobacion: boolean;
}

/**
 * Un CV del candidato para abrirlo desde SharePoint. Los dos del proceso —el que cargó GTH en la
 * long list y el que adjuntó el postulante en su formulario— tienen esta misma forma.
 */
export interface FormularioCv {
  nombre: string;
  /** Link al archivo en SharePoint. null si la subida no dejó url. */
  url: string | null;
}

/** Formulario del candidato para el modal "Ver formulario" de GTH. */
export interface FormularioRevision {
  /** false si GTH aún no envió el formulario (el modal solo muestra la estructura/estado). */
  existe: boolean;
  estadoCodigo: string;
  estadoNombre: string;
  candidatoNombre: string;
  correoEnvio: string | null;
  enviadoEn: string | null;
  completadoEn: string | null;
  revisadoNombre: string | null;
  revisadoEn: string | null;
  motivoRechazo: string | null;
  /** Datos declarados por el postulante (null si aún no completó el formulario). */
  datos: FormularioDatos | null;
  /** CV que GTH cargó en la long list de este candidato. null si la carga no dejó url. */
  cvGth: FormularioCv | null;
  /**
   * CV documentado que adjuntó el propio postulante al enviar el formulario. null si no lo subió
   * (los formularios anteriores a que se pidiera el archivo) o si todavía no lo envió.
   */
  cvPostulante: FormularioCv | null;
  /**
   * El documento declarado ya existe en la base. Null cuando no coincide con nada (el caso normal)
   * o cuando el postulante todavía no llenó el formulario.
   */
  coincidencia: FormularioCoincidencia | null;
}

/** Resultado de enviar el formulario o registrar la decisión (para refrescar el modal). */
export interface FormularioAccionResult {
  message: string;
  formulario: CandidatoFormularioResumen;
}

/** Resultado del envío del formulario de un candidato dentro de un envío masivo. */
export interface FormularioEnvioMasivoResultado {
  candidatoId: number;
  /** false si el candidato no pasó las validaciones o si su correo no llegó a salir. */
  enviado: boolean;
  /** Motivo del fallo, para mostrarlo junto al candidato. null si se envió bien. */
  error: string | null;
  /**
   * Estado del formulario tras el envío. Viene incluso cuando el correo falló —el formulario ya
   * quedó registrado en ese punto— y solo es null cuando no se llegó a tocar la base de datos.
   */
  formulario: CandidatoFormularioResumen | null;
}

/** Resultado del envío masivo: resumen del lote + el detalle de cada candidato. */
export interface FormularioEnvioMasivoResult {
  message: string;
  enviados: number;
  fallidos: number;
  resultados: FormularioEnvioMasivoResultado[];
}
