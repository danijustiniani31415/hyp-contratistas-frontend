export interface ProjectLinkDto {
  projectLinkId: number;
  projectId: number;
  projectDescription: string;
  projectLinkTypeId: number;
  projectLinkTypeDescription: string;
  linkUrl: string;
  active: boolean;
  createdDateTime: string;
  createdUserId: number;
}
