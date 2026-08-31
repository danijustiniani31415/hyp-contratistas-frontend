/**
 * Una fila de la pantalla "Reclutadores": un trabajador del área de Gestión del Talento Humano
 * con el interruptor que decide si sale o no en el desplegable "Responsable del proceso" del
 * detalle de Reclutamiento.
 *
 * La lista se arma sola con la gente del área (no hay alta ni baja manual), así que la fila se
 * identifica por `workerId` y no por el id de la tabla filtro, que puede no existir todavía.
 */
export interface ReclutadorDto {
  /** Ficha del trabajador en la base maestra (`workers.id`). */
  workerId: number;
  nombre: string;
  /** Puesto de la ficha. Null si no tiene puesto asignado. */
  puesto: string | null;
  /** true = sale en el desplegable "Responsable del proceso". */
  activo: boolean;
  /**
   * Ya no es del equipo de GTH (cambió de área o dejó de ser trabajador vigente) pero sigue
   * listado porque alguna vez se le activó. Se muestra para poder desactivarlo.
   */
  fueraDelEquipo: boolean;
  /** Área actual de la ficha. Solo se usa para explicar `fueraDelEquipo`. */
  area: string | null;
}

/** Respuesta del interruptor: el estado que quedó guardado, más el aviso a mostrar. */
export interface ReclutadorToggleResult {
  workerId: number;
  activo: boolean;
  message: string;
}
