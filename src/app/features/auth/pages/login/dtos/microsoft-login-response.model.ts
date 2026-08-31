export interface MicrosoftLoginResponseDTO {
  accessToken: string;
  sessionToken: string;
  expiresAt: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  userPrincipalName: string;
  mail?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones: string[];
  photoBase64?: string;
  allowedFeatures?: string[];
}
