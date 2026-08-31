export interface DashboardKpisDto {
  empresasActivas: number;
  empresasHabilitadas: number;
  empresasNoHabilitadas: number;
  workersTotal: number;
  workersHabilitados: number;
  workersNoAutorizados: number;
  workersAutorizadoTemporal: number;
  entregablesEmpresaVencidos: number;
  entregablesEmpresaFalta: number;
  entregablesTrabajadorVencidos: number;
  entregablesTrabajadorFalta: number;
  entregablesCasaVencidos: number;
  entregablesCasaFalta: number;
  emosVencidos: number;
  interconsultasPendientes: number;
  personalCasaTotal: number;
  personalCasaHabilitado: number;
  personalCasaNoHabilitado: number;
}

export interface EmpresaResumenDto {
  empresaId: number;
  nombre: string;
  habilitada: boolean;
  workersTotal: number;
  workersHabilitados: number;
  workersNoAutorizados: number;
}

export interface WorkerNombradoDto {
  workerId: number;
  nombre: string;
  dni: string;
  empresa: string;
  motivo: string;
}

export interface EntregableNombradoDto {
  entidad: string;
  item: string;
  vigencia: string | null;
}

export interface InterconsultaNombradaDto {
  workerId: number;
  nombre: string;
  empresa: string;
  especialidad: string;
  diasDesdeDerivacion: number;
}

export interface DashboardAdminDto {
  proyectoId: number;
  proyectoNombre: string;
  kpis: DashboardKpisDto;
  empresas: EmpresaResumenDto[];
  trabajadoresNoAutorizados: WorkerNombradoDto[];
  entregablesEmpresaVencidos: EntregableNombradoDto[];
  entregablesEmpresaFalta: EntregableNombradoDto[];
  entregablesTrabajadorVencidos: EntregableNombradoDto[];
  entregablesTrabajadorFalta: EntregableNombradoDto[];
  entregablesCasaVencidos: EntregableNombradoDto[];
  entregablesCasaFalta: EntregableNombradoDto[];
  emosVencidos: WorkerNombradoDto[];
  interconsultas: InterconsultaNombradaDto[];
  personalCasaNoHabilitado: WorkerNombradoDto[];
}
