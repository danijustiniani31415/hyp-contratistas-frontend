import { PersonDTO } from "../person/person.model";
import { RoleSimpleDTO } from "../role/RoleSimpleDTO.model";

export interface UserDTO {
  userId: number;
  person: PersonDTO;
  createdDateTime: string;
  createdUserId: number;
  updatedDateTime?: string | null;
  updatedUserId?: number | null;
  active: boolean;
  roles: RoleSimpleDTO[];
}
