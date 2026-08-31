/**
 * DTOs de la feature Onboarding (Gestión GTH): la fase que sigue a Reclutamiento. Espejo de
 * `Features/GestionGthModule/Features/OnboardingFeature/Application/Dtos/OnboardingDtos.cs`.
 */

/** Todo lo que la pantalla necesita al entrar, en una sola petición. */
export interface BandejaOnboarding {
  resumen: ResumenOnboarding;
  /** Fases del catálogo en orden, con cuántos colaboradores hay parados en cada una. */
  fases: FaseOnboarding[];
  colaboradores: OnboardingListItem[];
  /**
   * Candidatos aptos para iniciar onboarding: seleccionados de requerimientos ya cerrados que
   * todavía no tienen onboarding. Es el desplegable del modal «Nuevo ingreso».
   */
  candidatosAptos: CandidatoApto[];
}

export interface ResumenOnboarding {
  ingresosDelMes: number;
  enProceso: number;
  completos: number;
  colaboradoresNuevos: number;
  candidatosPorIngresar: number;
}

export interface FaseOnboarding {
  faseId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  /** Colaboradores parados en esta fase (es el conteo del embudo de la pantalla). */
  total: number;
  /**
   * Checklist operativo de la fase (catálogo, igual para todos los colaboradores). Viene con la
   * bandeja: es lo que dibuja el modal de detalle y de donde salen sus contadores de avance.
   */
  actividades: ActividadOnboarding[];
}

/** Una actividad obligatoria del checklist. El avance se mide en actividades, no en fases. */
export interface ActividadOnboarding {
  actividadId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  /** true = la cumple el sistema solo, sin acción de GTH (avisos preventivos de la solicitud). */
  automatica: boolean;
}

/** Una fila de la tabla «Colaboradores ingresados». */
export interface OnboardingListItem {
  onboardingId: number;
  candidatoId: number;
  personId: number | null;
  /** Código del requerimiento que originó la contratación (REQ-AAAA-NNNN). */
  codigo: string;
  nombre: string;
  puesto: string | null;
  area: string | null;
  empresa: string | null;
  proyectoObra: string | null;
  fechaIngreso: string | null;
  jefeDirecto: string | null;
  correo: string | null;
  faseCodigo: string;
  faseNombre: string;
  faseOrden: number;
  estadoCodigo: string;
  estadoNombre: string;
  /** Avance en % medido en actividades del checklist (no en fases). Lo calcula el backend. */
  avancePorcentaje: number;
  /**
   * Códigos de las actividades del checklist ya cumplidas por este colaborador. Es el único origen
   * de los checks del detalle: la pantalla no deduce nada por su cuenta.
   */
  actividadesHechas: string[];
  cartaOfertaNombre: string | null;
  cartaOfertaUrl: string | null;
  cartaOfertaEnviadaEn: string | null;

  // ── Carta oferta firmada (la que devuelve el colaborador) ────────────────
  cartaFirmadaNombre: string | null;
  cartaFirmadaUrl: string | null;
  cartaFirmadaSubidaEn: string | null;
  /**
   * Fecha en que el POSTULANTE firmó la carta desde el enlace público. Con valor, el documento vino
   * de él y GTH solo revisa; en null con `cartaFirmadaUrl` llena, lo subió GTH a mano.
   */
  cartaFirmadaPostulanteEn: string | null;
  /** Null = adjunta pero todavía sin revisar: es lo que bloquea el avance de la primera fase. */
  cartaFirmadaAprobadaEn: string | null;

  /** Carpeta de SharePoint donde vive el file digital del colaborador. */
  fileDigitalCarpeta: string | null;

  observacion: string | null;
  iniciadoEn: string | null;
}

/** Una opción del desplegable del modal «Nuevo ingreso». */
export interface CandidatoApto {
  candidatoId: number;
  requerimientoId: number;
  personId: number | null;
  nombre: string;
  codigo: string;
  puesto: string | null;
  area: string | null;
  empresa: string | null;
  proyectoObra: string | null;
  /**
   * Correo personal al que iría la carta oferta. Lo resuelve el backend desde la base de datos
   * (`person.email`, lo que GTH validó al aprobar el formulario del postulante). Null = no hay a
   * dónde enviar y el modal bloquea el envío.
   */
  correo: string | null;
  /**
   * DNI del colaborador, de la misma ficha que el correo. Con él se nombra su carpeta en el file
   * de colaboradores de SharePoint («80508050 - NOMBRE»), así que null = no se puede abrir el
   * onboarding y el modal bloquea el envío.
   */
  dni: string | null;
  jefeDirecto: string | null;
  /**
   * true si el candidato ya tiene ficha en `person`. La firma que va a dibujar en el enlace se
   * guarda ahí, así que sin ficha el modal bloquea el envío. La ficha la crea la aprobación de su
   * formulario de postulante en Reclutamiento.
   */
  tieneFichaMaestra: boolean;
}

/** Datos del modal «Nuevo ingreso» (van como JSON en el multipart; la carta va como archivo). */
export interface OnboardingCreate {
  candidatoId: number;
  fechaIngreso: string | null;
  /** Solo se manda si GTH corrigió a mano el correo que resolvió el backend. */
  correo: string | null;
  observacion: string | null;
}

export interface OnboardingCreateResult {
  onboardingId: number;
  message: string;
  colaborador: OnboardingListItem | null;
}

/** Resultado de subir/aprobar la carta firmada o de avanzar de fase: la fila ya actualizada. */
export interface OnboardingAccionResult {
  message: string;
  colaborador: OnboardingListItem | null;
}
