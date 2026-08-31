export interface ProjectSubContractorCreateDTO {
  projectId: number;
  contractorId: number;
  contractTypeId: number;
  contractModalityId?: number | null;
  paymentMethodId: number;
  paymentFormId?: number | null;
  includesCartaFianza?: boolean;
  advancePercentage?: number;
  advanceAmount?: number;
  amount: number;
  currencyId: number;
  hasIgv: boolean;
  workItemId: number;
  workItemCategoryId: number;
  workSpecialtyId?: number | null;
  isSubcontract: boolean;
  isLabor: boolean;
  contractWorkItemName: string;
  quotationFiles?: File[];
  comparativeFiles?: File[];
}
