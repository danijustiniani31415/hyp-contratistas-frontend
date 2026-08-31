export interface WorkItemCategoryClauseUpsertDto {
  workItemCategoryClauseId?: number;
  clauseText: string;
  sortOrder: number;
  /** Modalidad de contrato: 1=Suministro e Instalación, 2=Suministro, 3=Instalación */
  contractModalityId: number;
}

export interface WorkItemCategoryAnexo3ClauseUpsertDto {
  workItemCategoryAnexo3ClauseId?: number;
  clauseText: string;
  sortOrder: number;
}

export interface WorkItemCategoryAnexo4ClauseUpsertDto {
  workItemCategoryAnexo4ClauseId?: number;
  clauseText: string;
  sortOrder: number;
}

export interface WorkItemCategoryEditDto {
  workItemCategoryId: number;
  workItemCategoryDescription: string;
  workSpecialtyId: number | null;
  active: boolean;
  clauses: WorkItemCategoryClauseUpsertDto[];
  anexo3Clauses: WorkItemCategoryAnexo3ClauseUpsertDto[];
  anexo4Clauses: WorkItemCategoryAnexo4ClauseUpsertDto[];
}
