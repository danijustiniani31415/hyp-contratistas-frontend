/**
 * Estado de la ventana de subida de lecciones aprendidas para hoy (hora Lima).
 * Refleja LessonUploadWindowDTO del backend.
 */
export interface LessonUploadWindowDTO {
  /** true si hoy se pueden registrar lecciones (no es ventana de revisión). */
  canUpload: boolean;
  /** true si hoy cae en la ventana de revisión de la jefatura (subida bloqueada). */
  isReviewWindow: boolean;
  /** Inicio (4.º último día hábil) de la ventana de revisión, formato 'YYYY-MM-DD'. */
  reviewStart: string | null;
  /** Fin (último día hábil) de la ventana de revisión, formato 'YYYY-MM-DD'. */
  reviewEnd: string | null;
  /** Mensaje a mostrar cuando la subida está bloqueada (null si está habilitada). */
  message: string | null;
}
