/** Aviso al ingresar: interconsultas pendientes y EMOs vencidos de los proyectos donde el
 * usuario logueado es Administrador o Coordinador SSOMA. Calculado en vivo (sin cron). */
export interface AlertaLoginItemDto {
  workerNombre: string;
  razonSocial?: string | null;
  /** Días de retraso (interconsulta) o días vencido (EMO). */
  dias: number;
}

export interface AlertaLoginProyectoDto {
  proyectoId: number;
  proyectoNombre: string;
  interconsultas: AlertaLoginItemDto[];
  emosVencidos: AlertaLoginItemDto[];
}

export interface AlertaLoginSsomaResultDto {
  tieneAlertas: boolean;
  proyectos: AlertaLoginProyectoDto[];
}
