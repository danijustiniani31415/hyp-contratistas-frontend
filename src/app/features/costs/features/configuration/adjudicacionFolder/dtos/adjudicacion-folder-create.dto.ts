export interface AdjudicacionFolderCreateDto {
  projectId: number;
  /** Tipo de raíz base ("07_OT/BACK UP PROYECTO" o "04_OBRAS"). */
  folderTypeId: number;
  linkUrl: string;
  driveId: string;
  folderId: string;
}
