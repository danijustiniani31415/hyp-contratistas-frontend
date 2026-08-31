export interface FolderItemDto {
  id: string;
  name: string;
}

export interface FolderBrowseDto {
  driveId: string;
  folderId: string;
  folderName?: string | null;
  folders: FolderItemDto[];
}
