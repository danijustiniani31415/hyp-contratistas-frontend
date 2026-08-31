/**
 * Destinatarios de un correo del flujo de Gestión GTH, resueltos por el backend con la misma
 * lógica del envío real: lo que se muestra en pantalla es exactamente lo que va a salir.
 *
 * Viven acá porque los usan dos features del módulo, cada una previsualizando el correo que
 * dispara su propia acción: «Solicitud de Personal» (el correo de aprobación a Gerencia General)
 * y «Aprobaciones» (el correo a Gestión de Talento Humano con lo que Gerencia aprobó).
 */

/** Un destinatario del correo, con la razón por la que lo recibe. */
export interface DestinatarioSolicitud {
  email: string;
  /** Nombre de la persona cuando se conoce (los buzones configurados no lo tienen). */
  nombre: string | null;
  /** "Gerente General", "Gerente — {área}", "Correo configurado". Se muestra como tooltip. */
  origen: string;
}

/** Destinatarios principales (Para) y en copia (CC) de un correo. */
export interface SolicitudDestinatarios {
  para: DestinatarioSolicitud[];
  copias: DestinatarioSolicitud[];
}
