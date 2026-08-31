export interface TrayectoCreateDto {
  /** "HH:mm" */
  horaSalida: string;
  /** "HH:mm" or null (sin retorno) */
  horaRetorno: string | null;
  motivoId: number | null;
  motivoLibre: string | null;
  /** Detalle obligatorio cuando el motivo elegido lo exige. */
  motivoAdicional: string | null;
  lugarOrigenId: number | null;
  lugarOrigenLibre: string | null;
  lugarDestinoId: number | null;
  lugarDestinoLibre: string | null;
}

export interface SolicitudSalidaCreateDto {
  /** "yyyy-MM-dd" */
  fechaSalida: string;
  trayectos: TrayectoCreateDto[];
}
