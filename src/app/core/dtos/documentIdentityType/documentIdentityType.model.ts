export interface DocumentIdentityTypeDTO {
  documentIdentityTypeId: number;
  documentIdentityTypeDescription: string;
  documentIdentityTypeAbbreviation: string;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string | null;
  updatedUserId?: number | null;
  active: boolean;
}
