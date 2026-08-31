export interface ContractorUserItemDTO {
  userId: number;
  email: string;
  createdDateTime: string;
}

export interface ContractorEmailItemDTO {
  contractorEmailId: number | null;
  email: string;
  active: boolean;
  contractorPersonTypeId: number | null;
  /** Solo lectura: descripción de la clasificación (el backend la ignora al editar). */
  contractorPersonTypeDescription?: string | null;
}

export interface ContractorPendingUpdateDTO {
  contractorUpdateRequestId: number;
  contributorRuc: string;
  contributorName: string;
  contributorAddress?: string | null;
  contributorEconomicActivityDescription?: string | null;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
  legalRepresentativeDni?: string | null;
  legalRepresentativeFullName?: string | null;
  legalEntityRegistryNumber?: string | null;
  logoFileUrl?: string | null;
  brochureFileUrl?: string | null;
  fichaRucFileUrl?: string | null;
  referencesListFileUrl?: string | null;
  createdDateTime: string;
  emails: string[];
}

export interface ContractorManagementDTO {
  contractorId: number;
  contributorId: number;
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
  legalRepresentativeDni?: string | null;
  legalRepresentativeFullName?: string | null;
  legalEntityRegistryNumber?: string | null;
  contributorEconomicActivityDescription: string;
  contractorStateId: number;
  contractorStateDescription: string;
  createdDateTime: string;
  emails: string[];
  emailDetails: ContractorEmailItemDTO[];
  hasUser?: boolean;
  users: ContractorUserItemDTO[];
  logoFileUrl?: string | null;
  brochureFileUrl?: string | null;
  fichaRucFileUrl?: string | null;
  referencesListFileUrl?: string | null;
  pendingUpdate?: ContractorPendingUpdateDTO | null;
}
