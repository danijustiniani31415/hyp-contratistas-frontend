import { ProjectLinkTypeDto } from './project-link-type.dto';

export interface ProjectSimpleDto {
  projectId: number;
  projectDescription: string;
}

export interface ProjectLinkFormDataDto {
  projects: ProjectSimpleDto[];
  types: ProjectLinkTypeDto[];
}
