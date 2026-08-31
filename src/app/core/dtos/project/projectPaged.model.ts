import { ProjectGetDTO } from "./project.model";

export interface ProjectPagedDTO {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    data: ProjectGetDTO[];
}