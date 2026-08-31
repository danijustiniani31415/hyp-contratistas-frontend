export interface WorkItemValorizationFormUpsertDto {
  workItemValorizationFormId?: number;
  concept: string;
  percentage: number;
  sortOrder: number;
}

export interface WorkItemEditDto {
  workItemId: number;
  workItemDescription: string;
  workItemCategoryId: number | null;
  active: boolean;
  valorizationForms: WorkItemValorizationFormUpsertDto[];
}
