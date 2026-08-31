export interface ProjectSubContractorFiltersDTO {
  page: number;
  projectId: number | null;
  contributorName: string;
  contributorRuc: string;
  contractTypeId: number | null;
  contractModalityId: number | null;
  paymentMethodId: number | null;
  projectSubContractorStatusId: number | null;
}
