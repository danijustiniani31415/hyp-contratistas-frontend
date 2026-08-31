/** Una notificación del panel de la campanita. */
export interface NotificacionItem {
  id: number;
  titulo: string;
  /** Línea secundaria, p.ej. "Puesto — Área". */
  subtitulo: string | null;
  /** Detalle, p.ej. la justificación de la solicitud. */
  descripcion: string | null;
  /** Código de referencia, p.ej. REQ-AAAA-NNNN. */
  referencia: string | null;
  /** Nombre de quien generó el evento (para las iniciales del avatar). */
  origenNombre: string | null;
  /** false = colores "prendidos" + punto azul; true = atendida/apagada. */
  leida: boolean;
  /** Fecha de creación (ISO, ya en hora Perú). */
  fecha: string;
}

/** Respuesta de la campanita: contador + lista en una sola petición. */
export interface Notificaciones {
  noLeidas: number;
  notificaciones: NotificacionItem[];
}
