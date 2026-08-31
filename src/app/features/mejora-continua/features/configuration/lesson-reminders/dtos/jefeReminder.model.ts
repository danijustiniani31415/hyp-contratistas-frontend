export interface JefeReminderConfigItemDTO {
  lessonJefeReminderId: number | null;
  workerId: number;
  fullName?: string;
  email?: string;
  /** Nombre de la categoría tal cual el catálogo (MAYÚSCULAS): JEFE | COORDINADOR | RESIDENTE. */
  categoria?: string;
  active: boolean;
}

export interface ToggleJefeReminderResultDTO {
  lessonJefeReminderId: number;
  active: boolean;
}
