export interface LugarProyectoOptionDto {
  id: number;
  nombreDisplay: string;
}

export interface SolicitudSalidaFilterDataDto {
  lugaresProyecto: LugarProyectoOptionDto[];
}
