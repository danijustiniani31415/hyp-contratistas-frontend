/** Carpeta única (singleton) configurada para guardar los adjuntos de las solicitudes de salida. */
export interface GaAdjuntoFolderDto {
  gaAdjuntoFolderId: number;
  linkUrl: string;
  driveId: string;
  folderId: string;
  folderName?: string | null;
  webUrl?: string | null;
  active: boolean;
  createdDateTime: string;
  createdUserId: number;
}

/** Datos para configurar/actualizar la carpeta única: solo el link pegado por el usuario. */
export interface GaAdjuntoFolderSaveDto {
  linkUrl: string;
}
