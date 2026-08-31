/** Opción genérica {id, nombre} para los desplegables del formulario. */
export interface OpcionFormulario {
  id: number;
  nombre: string;
}

/**
 * Tipo de documento para el desplegable. Trae el `codigo` estable (DNI / CE) para aplicar las
 * reglas del campo "Número de documento" (el DNI son 8 dígitos) sin comparar contra el texto visible.
 */
export interface TipoDocumentoOpcion extends OpcionFormulario {
  /** DNI o CE. */
  codigo: string;
}

/** Distrito para el desplegable (incluye la provincia para agrupar/mostrar). */
export interface DistritoOpcion {
  id: number;
  nombre: string;
  /** LIMA o CALLAO. */
  provincia: string;
}

/**
 * Respuestas del formulario del postulante (ids de catálogo + valores libres). Se usa para precargar
 * (GET público) y para enviar (POST público). Las fechas van como 'YYYY-MM-DD'.
 */
export interface PostulanteFormularioRespuestas {
  // Página 0 · Consentimiento de protección de datos
  consentimientoDatosPersonales: boolean | null;
  // Página 1 · Datos personales
  nombresCompletos: string | null;
  fechaNacimiento: string | null;
  estadoCivilId: number | null;
  tipoDocumentoId: number | null;
  numeroDocumento: string | null;
  distritoId: number | null;
  correoElectronico: string | null;
  numeroCelular: string | null;
  pretensionesSalariales: string | null;
  disponibilidadId: number | null;
  linkedin: string | null;
  portafolioLink: string | null;
  // Página 2 · Estudios realizados
  profesion: string | null;
  universidadId: number | null;
  gradoAcademicoId: number | null;
  numeroColegiatura: string | null;
  // Página 3 · Experiencia laboral
  empresa: string | null;
  areaTrabajo: string | null;
  cargo: string | null;
  fechaInicio: string | null;
  fechaTermino: string | null;
  motivoCeseId: number | null;
  funcionesPrincipales: string | null;
  logros: string | null;
  ingresoBrutoMensual: string | null;
  personasACargo: number | null;
  jefeInmediato: string | null;
  autorizaVerificacionReferencias: boolean | null;
  // Página 4 · Consentimiento y veracidad
  declaracionVeracidad: boolean | null;
  confirmacionDocumentos: boolean | null;
}

/** Respuesta del GET público: contexto + catálogos + respuestas guardadas + estado. */
export interface PostulanteFormularioPublico {
  puesto: string;
  candidatoNombre: string;
  estadoCodigo: string;
  estadoNombre: string;
  /** true si GTH ya aprobó el formulario → solo lectura. */
  soloLectura: boolean;
  /**
   * Observaciones de GTH cuando el formulario fue RECHAZADO: se muestran en cada página para que el
   * postulante corrija lo indicado sobre sus propias respuestas. null en cualquier otro estado.
   */
  observaciones: string | null;
  estadosCiviles: OpcionFormulario[];
  tiposDocumento: TipoDocumentoOpcion[];
  distritos: DistritoOpcion[];
  universidades: OpcionFormulario[];
  gradosAcademicos: OpcionFormulario[];
  disponibilidades: OpcionFormulario[];
  motivosCese: OpcionFormulario[];
  respuestas: PostulanteFormularioRespuestas;
  /**
   * Nombre del CV documentado que el postulante ya subió, para que al reabrir el enlace (o al
   * corregir un formulario observado) sepa que no tiene que volver a adjuntarlo. null si todavía
   * no subió ninguno. No viene la url: el archivo está en SharePoint y el postulante no tiene
   * acceso, así que un enlace solo le daría un error de permisos.
   */
  cvNombre: string | null;
}

/** Respuesta vacía por defecto (antes de cargar / para inicializar el modelo). */
export function respuestasVacias(): PostulanteFormularioRespuestas {
  return {
    consentimientoDatosPersonales: null,
    nombresCompletos: null, fechaNacimiento: null, estadoCivilId: null, tipoDocumentoId: null,
    numeroDocumento: null, distritoId: null, correoElectronico: null, numeroCelular: null,
    pretensionesSalariales: null, disponibilidadId: null, linkedin: null,
    portafolioLink: null, profesion: null, universidadId: null, gradoAcademicoId: null,
    numeroColegiatura: null, empresa: null, areaTrabajo: null, cargo: null, fechaInicio: null,
    fechaTermino: null, motivoCeseId: null, funcionesPrincipales: null, logros: null,
    ingresoBrutoMensual: null, personasACargo: null, jefeInmediato: null,
    autorizaVerificacionReferencias: null, declaracionVeracidad: null, confirmacionDocumentos: null,
  };
}
