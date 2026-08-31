/**
 * Modelos de solo lectura del Centro de aprendizaje (videos-guía) consumidos por el
 * /inicio y por el modal de /auth/login. La administración (CRUD) usa sus propios DTOs
 * dentro de la feature de Configuración.
 */

export interface LearningVideoDto {
  titulo: string;
  url: string;
  /** Miniatura opcional; si es null el front muestra un ícono de play genérico. */
  img?: string | null;
}

export interface LearningCategoryDto {
  id: number;
  nombre: string;
  /** Color de acento del grupo (hex); si es null el front usa el teal por defecto. */
  accentColor?: string | null;
  videos: LearningVideoDto[];
}
