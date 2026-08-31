export interface BandejaItemDto {
  id: number;
  tipo: string;
  nombreEntregable: string;
  entidadNombre: string;
  empresaNombre?: string;
  proyectoNombre?: string;
  proyectoId?: number;
  estado: string;
  vigencia?: string;
  archivoUrl?: string;
  archivos?: { nombreArchivo: string; archivoUrl: string }[];
  obsContratista?: string;
  responsable: string;
  fechaEnvio?: string;
  itemId?: number;
  esMensual?: boolean;
  mes?: number;
  anio?: number;
  mesesPendientes?: number;
  requiereVigencia?: boolean;
  meses?: {
    id: number;
    mes: number;
    anio: number;
    estado: string;
    vigencia?: string;
    archivos?: { id: number; nombreArchivo: string; archivoUrl: string; esZip: boolean; orden: number }[];
  }[];
}

export interface BandejaAprobarDto {
  estado: string;
  obsAbril?: string;
  vigencia?: string;
  motivoRechazo?: string;
}
