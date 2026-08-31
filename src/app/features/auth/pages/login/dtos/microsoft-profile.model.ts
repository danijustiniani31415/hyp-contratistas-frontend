export interface MicrosoftProfileDTO {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  userPrincipalName: string;
  mail?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones: string[];
}
