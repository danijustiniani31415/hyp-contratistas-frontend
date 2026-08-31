export interface ProjectSimpleDto {
  projectId: number;
  projectDescription: string;
}

export interface FolderTypeSimpleDto {
  folderTypeId: number;
  folderTypeDescription: string;
}

export interface AdjudicacionFolderFormDataDto {
  projects: ProjectSimpleDto[];
  folderTypes: FolderTypeSimpleDto[];
}
