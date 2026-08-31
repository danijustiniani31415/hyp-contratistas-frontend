export interface ContractorTokenValidationDTO {
  contributorName: string;
  emails: string[];
}

export interface ContractorCredentialsCreateDTO {
  token: string;
  email: string;
  password: string;
  confirmPassword: string;
}
