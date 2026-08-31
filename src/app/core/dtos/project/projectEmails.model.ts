/** Un trabajador elegible como residente del proyecto. */
export interface ResidenteOptionDTO {
  workerId: number;
  nombreCompleto: string;
  email: string;
}

/**
 * Lo que se manda al guardar los correos SSOMA del proyecto.
 *
 * El residente ya no es un correo escrito a mano sino el id del trabajador: su correo
 * se lee de `workers.email_corporativo` al enviar, así no queda una segunda copia que
 * se desactualiza. En este campo null SÍ limpia el valor (el formulario manda siempre
 * el objeto completo); en los correos de texto, null es "no tocar".
 */
export interface ProjectEmailsDTO {
  residenteWorkersId?: number | null;
  emailResponsable?: string | null;
  emailRrhh?: string | null;
  emailCoordSsoma?: string | null;
  emailCoordAdmin?: string | null;
}

/** Respuesta al abrir el formulario: valores actuales + trabajadores elegibles. */
export interface ProjectEmailsResponseDTO extends ProjectEmailsDTO {
  /** Nombre del residente actual, para mostrarlo sin buscarlo en la lista. */
  residenteNombre?: string | null;
  /** Correo corporativo del residente actual — el que realmente se va a usar. */
  residenteEmail?: string | null;
  residentes: ResidenteOptionDTO[];
}
