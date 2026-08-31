/**
 * Quién obtuvo el puesto de un requerimiento. Vive acá porque lo usan dos features del módulo,
 * cada una desde su lado del proceso: «Reclutamiento» (el detalle que ve GTH) y «Solicitud de
 * Personal» (el «Estado del reclutamiento» que ve el área solicitante). El resultado tiene que
 * quedar registrado y consultable por ambos, no solo en el correo del momento.
 */
export interface Seleccionado {
  candidatoId: number;
  /** Nombre del candidato que obtuvo el puesto. */
  nombre: string;
  /** Puesto del requerimiento (snapshot de la long list), no un dato por candidato. */
  puesto: string | null;
  /** Nombre y link del CV que cargó GTH en la long list. */
  cvNombre: string | null;
  cvUrl: string | null;
  /**
   * Nombre y link del CV documentado que adjuntó el propio postulante en su formulario. null si no
   * llegó a subirlo (los procesos anteriores a que se pidiera el archivo).
   */
  cvPostulanteNombre: string | null;
  cvPostulanteUrl: string | null;
  /** Momento en que el solicitante lo aprobó (ISO, ya en hora Perú). */
  seleccionadoEn: string | null;
  /** Usuario del área solicitante que tomó la decisión final. */
  seleccionadoPor: string | null;
  /** Responsable del proceso en GTH (el reclutador que llevó la vacante). */
  responsableGth: string | null;
  /**
   * Ficha de pre-ingreso del seleccionado en workers: el id con el que GTH abre la programación
   * de su EMO de Ingreso. Null si el candidato nunca tuvo formulario del postulante aprobado.
   */
  workerId: number | null;
  /**
   * true mientras su EMO de Ingreso siga sin programarse: es lo que enciende el botón «Programar
   * EMO de ingreso». Ya no equivale a "el proceso sigue abierto" — con la cita creada y el
   * resultado pendiente es false y el requerimiento sigue en EMO de ingreso.
   */
  emoIngresoPendiente: boolean;
  /**
   * Estado de la cita del EMO ("Programado", "Aceptado por Clínica", "En Atención", "Completado"…).
   * null si todavía no se le programó ninguna. Es lo que explica por qué el proceso sigue abierto
   * entre la cita y el resultado.
   */
  emoProgramacionEstado: string | null;
  /** Fecha de la cita del EMO (ISO, hora Perú). null si no hay cita. */
  emoFechaProgramada: string | null;
  /**
   * Aptitud del EMO ya registrado ("Apto", "Apto con Restricciones", "Observado", "No Apto").
   * null mientras la clínica no cargue el resultado.
   *
   * Es la que decide a qué fase va el requerimiento —EMO_APTO, EMO_APTO_RESTRICCIONES,
   * EMO_OBSERVADO o EMO_NO_APTO—, pero ninguna de ellas cierra el proceso: con un apto el cierre
   * lo confirma GTH desde el detalle, que es lo que pasa al seleccionado a onboarding.
   */
  emoAptitud: string | null;
  /**
   * true en un escenario que no debería darse: el requerimiento sigue esperando el EMO de Ingreso
   * pero la ficha que le tocó al seleccionado es de alguien que ya trabaja en Abril, así que no es
   * un pre-ingreso y el backend rechaza esa cita. Excluyente con `emoIngresoPendiente`.
   */
  emoIngresoBloqueado: boolean;
  /** Estado de esa ficha ("Activo"…) para nombrarlo en el aviso. Solo si `emoIngresoBloqueado`. */
  fichaEstadoNombre: string | null;
}
