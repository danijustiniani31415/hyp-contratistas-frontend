/** DTOs de administración del Centro de aprendizaje (grupos + videos). */

export interface LearningVideoAdminDto {
  id: number;
  titulo: string;
  url: string;
  img?: string | null;
  orden: number;
  activo: boolean;
}

export interface LearningCategoryAdminDto {
  id: number;
  nombre: string;
  accentColor?: string | null;
  orden: number;
  surfaceId: number;
  surfaceCode: string;
  surfaceNombre: string;
  esPublicoInterno: boolean;
  activo: boolean;
  roleIds: number[];
  videos: LearningVideoAdminDto[];
}

export interface LearningSurfaceDto {
  id: number;
  code: string;
  nombre: string;
}

export interface LearningRoleOptionDto {
  id: number;
  descripcion: string;
}

/** Todo lo que la página de administración carga en una sola petición. */
export interface LearningAdminDataDto {
  categorias: LearningCategoryAdminDto[];
  superficies: LearningSurfaceDto[];
  roles: LearningRoleOptionDto[];
}

export interface LearningCategoryCreateDto {
  nombre: string;
  surfaceId: number;
  accentColor?: string | null;
  orden: number;
  esPublicoInterno: boolean;
  roleIds: number[];
}

export type LearningCategoryEditDto = LearningCategoryCreateDto;

export interface LearningVideoCreateDto {
  categoriaId: number;
  titulo: string;
  url: string;
  img?: string | null;
  orden: number;
}

export interface LearningVideoEditDto {
  titulo: string;
  url: string;
  img?: string | null;
  orden: number;
}
