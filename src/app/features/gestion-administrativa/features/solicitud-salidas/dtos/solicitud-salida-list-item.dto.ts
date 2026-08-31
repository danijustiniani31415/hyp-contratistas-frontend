import { ConsolidadoS10Ambito } from '../../../shared/components/consolidado-s10-modal/consolidado-s10.dto';

export interface SolicitudSalidaListItemDto {
  id: number;
  fechaSalida: string;
  /** Hora de salida del primer trayecto. */
  horaSalida: string;
  /** Hora de retorno del último trayecto. */
  horaRetorno: string | null;
  /** Motivo del primer trayecto. */
  motivo: string;
  /** Origen del primer trayecto. */
  lugarOrigen: string | null;
  /** Destino del último trayecto. */
  lugarDestino: string | null;
  trayectosCount: number;
  estadoAprobacion: string;
  estadoRendicion: string;
  createdAt: string;
  /** True si todos los trayectos tienen capturas (o catálogo TI) — habilita la rendición. */
  puedeRendirse: boolean;

  // ── Consolidado del S10 (solo salidas rendidas) ──────────────────────
  /** URL del PDF Consolidado del S10 vigente, o null si aún no se adjuntó. */
  consolidadoS10Url: string | null;
  /** Nombre del archivo del consolidado vigente. Null si no hay. */
  consolidadoS10Filename: string | null;
  /** "Rendicion" (cubre toda la planilla) | "Solicitud" (solo esta salida) | null si no hay. */
  consolidadoS10Ambito: ConsolidadoS10Ambito | null;

  // ── Reembolso ────────────────────────────────────────────────────────
  /**
   * Visto bueno de la jefatura al GASTO, una vez rendida la salida y adjunto el Consolidado del
   * S10: "Pendiente" | "Aprobado" | "Rechazado" | "Firmado" | "Pagado".
   */
  estadoReembolso: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Firmado' | 'Pagado';
  /** Lo que el jefe observó al rechazar: es lo que hay que subsanar. */
  observacionReembolso: string | null;
  /** True cuando ya se le puede avisar al revisor (rendida + S10 adjunto + reembolso abierto). */
  puedeNotificarRevisor: boolean;
  /** Última vez que se le avisó al revisor. Null si nunca. */
  revisorNotificadoAt: string | null;
}
