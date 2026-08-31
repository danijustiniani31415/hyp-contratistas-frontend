/**
 * Tipo de descanso (ss_descanso_tipo). En Mi Salud solo llegan los que el trabajador puede
 * elegir y se le muestran con `nombreCorto` ("Accidente" / "Enfermedad"); lo que se guarda
 * y se reporta es siempre el `nombre` largo ("Accidente común" / "Enfermedad común").
 */
export interface DescansoTipoDto {
  id: number;
  nombre: string;
  nombreCorto: string;
}

export interface MiSaludResumenDto {
  workerId: number;
  workerNombre: string | null;
  tieneEmo: boolean;
  emoId: number | null;
  tipoEmo: string | null;
  aptitud: string | null;
  fechaEmo: string | null;
  fechaVencimiento: string | null;
  diasParaVencer: number | null;
  restriccionesVigentes: string[];
  ultimoDescansoEstado: string | null;
  ultimoDescansoFechaFin: string | null;
  tiposDescanso: DescansoTipoDto[];
}

export interface MiDescansoAdjuntoDto {
  /** Id del adjunto: el archivo se pide al backend por este id, no por su url de SharePoint. */
  id: number;
  url: string;
  nombre: string | null;
}

export interface MiDescansoDto {
  id: number;
  /** Nombre largo del tipo, resuelto en el backend desde el catálogo. */
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number | null;
  diagnostico: string | null;
  estado: string | null;
  motivoRechazo: string | null;
  urlCertificado: string | null;
  urlDocumento: string | null;
  adjuntos: MiDescansoAdjuntoDto[];
  createdAt: string;
}

export interface CrearMiDescansoDto {
  fechaInicio: string;
  fechaFin: string;
  dias?: number | null;
  tipoId: number;
  diagnostico?: string | null;
}

/** Destinatario del correo de descanso médico (pantalla de Configuración). */
export interface MiDescansoCorreoConfigDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  /** true = se envía el correo a este destinatario; false = no se envía. */
  active: boolean;
  orden: number;
}
