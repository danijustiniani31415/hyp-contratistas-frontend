export interface GaTrayectoListItemDto {
  id: number;
  lugarOrigenId: number;
  lugarOrigenNombre: string;
  lugarDestinoId: number;
  lugarDestinoNombre: string;
  monto: number;
  activo: boolean;
  createdAt: string;
}

export interface GaTrayectoCreateDto {
  lugarOrigenId: number;
  lugarDestinoId: number;
  monto: number;
}

export interface GaTrayectoEditDto {
  lugarOrigenId: number;
  lugarDestinoId: number;
  monto: number;
}

export interface GaTrayectoLugarOptionDto {
  id: number;
  nombreDisplay: string;
}
