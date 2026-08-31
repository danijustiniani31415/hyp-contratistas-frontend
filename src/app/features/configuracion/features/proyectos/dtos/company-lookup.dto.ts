export interface ContributorLookupDto {
  contributorId: number;
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
  legalEntityRegistryNumber?: string | null;
}
