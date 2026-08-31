import { DocumentIdentityTypeDTO } from "../documentIdentityType/documentIdentityType.model"

export interface PersonDTO {
  personId: number;
  documentIdentityCode: string;
  documentIdentityType: DocumentIdentityTypeDTO;
  fullName: string;
  email: string;
}
