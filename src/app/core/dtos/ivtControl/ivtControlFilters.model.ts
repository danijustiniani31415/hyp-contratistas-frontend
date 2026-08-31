import { ProjectSimpleDTO } from "../../dtos/project/projectSimple.model";
import { UserSimpleDTO } from "../user/userSimple.model";

export interface IvtControlFiltersDTO {
    projects: ProjectSimpleDTO[];
    residents: UserSimpleDTO[];
    periods: string[];
}