export interface WorkItemCategorySimpleDTO {
  workItemCategoryId: number;
  workItemCategoryDescription?: string;
  workSpecialtyId?: number | null; // especialidad a la que pertenece (para filtrado en cascada)
  instructivosSyncStatus?: number | null; // 1=automático, 2=manual, 3=sin instructivo
  instructivosFolderName?: string | null; // nombre del instructivo asociado
}
