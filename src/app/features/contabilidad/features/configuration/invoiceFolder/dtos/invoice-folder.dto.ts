/** Carpeta única (singleton) configurada para guardar las facturas. */
export interface InvoiceFolderDto {
  invoiceFolderId: number;
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
export interface InvoiceFolderSaveDto {
  linkUrl: string;
}
