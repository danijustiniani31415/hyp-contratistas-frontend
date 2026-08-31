export interface ScopeItemDTO {
  scopeItemId: number;
  lessonAreaId: number;
  catalogItemId: number;
  catalogItemDescription: string;
  catalogTypeName: string;
  scopeItemParentId: number | null;
  displayOrder: number;
  active: boolean;
  children: ScopeItemDTO[];
}
