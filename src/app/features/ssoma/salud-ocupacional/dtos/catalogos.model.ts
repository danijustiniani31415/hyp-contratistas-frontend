export interface ClinicaSimpleDto {
  id: number;
  nombre: string;
  ruc?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  activo: boolean;
}

export interface ClinicaUpsertDto {
  nombre: string;
  ruc?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  activo?: boolean;
}

export interface MedicoSimpleDto {
  id: number;
  apellidoNombre: string;
  dni?: string;
  cmp?: string;
  especialidad?: string;
  clinicaId?: number;
  clinicaNombre?: string;
  email?: string;
  celular?: string;
  activo: boolean;
}

export interface MedicoUpsertDto {
  apellidoNombre: string;
  dni?: string | null;
  cmp?: string | null;
  especialidad?: string | null;
  clinicaId?: number | null;
  email?: string | null;
  celular?: string | null;
  activo?: boolean;
}

export interface EmoTipoDto {
  id: number;
  nombre: string;
  vigenciaMeses: number;
  requiereNuevo: boolean;
  descripcion?: string;
  activo?: boolean;
}

export interface EmoTipoUpsertDto {
  nombre: string;
  vigenciaMeses: number;
  requiereNuevo: boolean;
  descripcion?: string | null;
  activo?: boolean;
}

export interface ExamenTipoDto {
  id: number;
  nombre: string;
  codigo?: string;
  categoria?: string;
}

export interface RestriccionTipoDto {
  id: number;
  descripcion: string;
  categoria?: string;
}

export interface AgenteRiesgoDto {
  id: number;
  nombre: string;
  tipo: string;
  activo: boolean;
}

export interface EmpresaSimpleDto {
  id: number;
  nombre: string;
  ruc?: string;
  direccion?: string;
  partidaRegistral?: string;
  tipoActividad?: string;
  activo?: boolean;
  esAbril: boolean;
}

export interface EmpresaUpsertDto {
  nombre: string;
  ruc?: string | null;
  direccion?: string | null;
  partidaRegistral?: string | null;
  tipoActividad?: string | null;
  activo?: boolean;
}

/** Alta de una razón social (todos obligatorios salvo partida registral). */
export interface EmpresaCreateDto {
  ruc: string;
  nombre: string;
  direccion: string;
  tipoActividad: string;
  distrito: string;
  provincia: string;
  departamento: string;
  partidaRegistral?: string | null;
}

/** Respuesta de la consulta RUC a SUNAT. */
export interface SunatContributorDTO {
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorEconomicActivityDescription: string;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
}

export interface ClinicaEmailDto {
  id: number;
  email: string;
  nombre: string;
}

export interface ClinicaEmailCreateDto {
  email: string;
  nombre: string;
}
