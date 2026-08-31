export interface EmailContactItem {
  email: string;
  personTypeId: number | null;
}

export interface ContributorRegisterDTO {
  contributorRuc: string;
  contributorName: string;
  address?: string;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
  economicActivityDescription?: string;
  legalRepresentativeDni?: string | null;
  legalRepresentativeFullName?: string | null;
  legalEntityRegistryNumber?: string | null;
  graphAccessToken?: string;
  brochureFile?: File | null;
  fichaRucFile?: File | null;
  referencesListFile?: File | null;
}
