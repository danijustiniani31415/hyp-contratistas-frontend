export interface ClinicaListDto {
  id: number;
  nombre: string;
  ruc?: string;
  email?: string;
  telefono?: string;
  activo: boolean;
}

export interface ClinicaDetalleDto {
  id: number;
  nombre: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
}

export interface ClinicaUpsertDto {
  nombre: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface ClinicaUsuarioListDto {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  ultimoAcceso?: string;
}

export interface ClinicaPagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClinicaUsuarioCreateDto {
  nombre: string;
  email: string;
}

export interface ClinicaUsuarioUpdateDto {
  nombre?: string;
  email?: string;
}
