export interface AdjudicacionFolderDto {
  projectAdjudicacionFolderId: number;
  projectId: number;
  projectDescription: string;
  folderTypeId: number;
  folderTypeDescription: string;
  linkUrl: string;
  driveId: string;
  folderId: string;
  folderName?: string | null;
  webUrl?: string | null;
  active: boolean;
  createdDateTime: string;
  createdUserId: number;
}
