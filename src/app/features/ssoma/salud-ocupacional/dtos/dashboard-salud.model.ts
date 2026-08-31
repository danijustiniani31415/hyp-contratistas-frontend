export interface DashboardSaludOcupacionalDto {
  totalTrabajadores: number;
  totalAbril: number;
  totalContratistas: number;
  emosPorAptitud: AptitudResumenDto;
  emosPorVencer: VencimientoResumenDto;
  emosVencidos: number;
  interconsultasPendientes: number;
  programacionesSemana: number;
  trabajadoresInhabilitados: number;
  proximosVencer?: ProximoVencerDto[];
}

export interface AptitudResumenDto {
  apto: number;
  aptoConRestricciones: number;
  noApto: number;
  observado: number;
  sinEmo: number;
}

export interface VencimientoResumenDto {
  dias30: number;
  dias15: number;
  dias7: number;
}

export interface ProximoVencerDto {
  workerId: number;
  nombre: string;
  dni: string;
  fechaVencimiento: string;
  diasParaVencer: number;
  empresa: string;
}
