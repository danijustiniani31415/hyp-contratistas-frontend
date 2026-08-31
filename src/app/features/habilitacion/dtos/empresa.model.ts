export interface EmpresaPorProyectoDto {
  empresaId: number;
  nombre: string;
  habilitada: boolean;
  entregablesSsomaSubidos: number;
  entregablesSsomaFaltantes: number;
  entregablesAdminSubidos: number;
  entregablesAdminFaltantes: number;
}

export interface EmpresaSimpleDto {
  id: number;
  razonSocial: string;
  nombreComercial?: string;
  logoUrl?: string;
}

export interface EmpresaContratistaListDto {
  id: number;
  razonSocial: string;
  nombreComercial?: string;
  ruc?: string;
  tipo: string;
  activo: boolean;
  emailAdmin?: string;
  emailSsoma?: string;
  logoUrl?: string;
  rubro?: string;
  esAbril?: boolean;
}

export interface EmpresaContratistaDetalleDto extends EmpresaContratistaListDto {
  direccion?: string;
  emailGerente?: string;
  emailResidente?: string;
  partidaRegistral?: string;
  activoRetirado?: string;
  proyectoId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmpresaContratistaCreateDto {
  razonSocial: string;
  nombreComercial?: string;
  ruc?: string;
  rubro?: string;
  direccion?: string;
  password: string;
  emailGerente?: string;
  emailAdmin?: string;
  emailResidente?: string;
  emailSsoma?: string;
  logoUrl?: string;
  partidaRegistral?: string;
  tipo: string;
  activo: boolean;
}

export interface ContratistaLoginDto {
  empresaId: number;
  password: string;
}

export interface ContratistaTokenDto {
  token: string;
  empresaId: number;
  razonSocial: string;
  tipo: string;
  allowedFeatures: string[];
  scope?: string;
  proyectoIds?: number[];
  modulos?: string;
}

export interface EntregableMesArchivoDto {
  id: number;
  nombreArchivo: string;
  archivoUrl: string;
  esZip: boolean;
  orden: number;
}

export interface EntregableMesDto {
  id: number;
  mes: number;
  anio: number;
  estado: string;
  vigencia?: string;
  archivoUrl?: string;
  archivos?: EntregableMesArchivoDto[];
  obsAbril?: string;
  obsContratista?: string;
  motivoRechazo?: string;
}

export interface EmpresaEntregableDto {
  id: number;
  itemId: number;
  nombreItem: string;
  estado: string;
  vigencia?: string;
  archivoUrl?: string;
  archivos?: EntregableMesArchivoDto[];
  obsAbril?: string;
  obsContratista?: string;
  motivoRechazo?: string;
  requiereVigencia: boolean;
  esMensual: boolean;
  responsable: string;
  mes?: number;
  anio?: number;
  meses: EntregableMesDto[];
}

export interface EmpresaEntregableUpdateDto {
  estado?: string;
  vigencia?: string;
  archivoUrl?: string;
  obsAbril?: string;
  obsContratista?: string;
  motivoRechazo?: string;
  mes?: number;
  anio?: number;
}

export interface EmpresaProyectoDto {
  proyectoId: number;
  proyectoNombre: string;
}

export interface ProyectoDisponibleDto {
  id: number;
  nombre: string;
  estaActiva: boolean;
  fechaInicio?: string;
}
