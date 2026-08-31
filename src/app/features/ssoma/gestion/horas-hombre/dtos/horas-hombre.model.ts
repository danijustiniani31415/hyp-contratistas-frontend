export interface HorasHombreDiaDto {
  fecha: string;
  proyectoId: number;
  proyectoNombre: string;
  personasCasa: number;
  personasContratista: number;
  totalPersonas: number;
  horasHombre: number;
}

export interface HorasHombreSerieDiaDto {
  fecha: string;
  horasHombreCasa: number;
  horasHombreContratista: number;
  horasHombreTotal: number;
}

export interface HorasHombrePorEmpresaDto {
  empresaId: number;
  empresaNombre: string;
  horasHombre: number;
  totalPersonasDia: number;
}

export interface HorasHombreProyectoResumenDto {
  proyectoId: number;
  proyectoNombre: string;
  horasHombre: number;
}

export interface HorasHombreDashboardDto {
  proyectoId: number | null;
  mes: number | null;
  anio: number | null;
  totalHorasHombre: number;
  totalHorasHombreCasa: number;
  totalHorasHombreContratista: number;
  diasRegistrados: number;
  promedioPersonasPorDia: number;
  ultimaFechaRegistrada: string | null;
  serieDiaria: HorasHombreSerieDiaDto[];
  porEmpresa: HorasHombrePorEmpresaDto[];
  porProyecto: HorasHombreProyectoResumenDto[];
}
