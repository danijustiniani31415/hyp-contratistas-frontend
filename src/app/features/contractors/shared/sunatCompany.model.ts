export interface SunatContributorDTO {
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorEconomicActivityDescription: string;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
}
