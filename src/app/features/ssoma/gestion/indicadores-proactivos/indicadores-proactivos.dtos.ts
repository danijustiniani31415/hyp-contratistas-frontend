// ─── Tipos de Inspección ───────────────────────────────────────────────────

export interface InspeccionTipoDto {
  id: number;
  nombre: string;
}

// ─── Programación de Inspecciones ──────────────────────────────────────────

export interface EmpresaProgInspeccionDto {
  empresaId: number | null;
  empresaTipo: 'Casa' | 'Contratista';
  empresaNombre: string;
  tiposAplicables: number[];
}

export interface ProgInspeccionResumenDto {
  proyectoId: number;
  mes: number;
  anio: number;
  empresas: EmpresaProgInspeccionDto[];
}

export interface GuardarProgInspeccionRequest {
  proyectoId: number;
  mes: number;
  anio: number;
  empresaId: number | null;
  empresaTipo: 'Casa' | 'Contratista';
  tiposAplicables: number[];
}

// ─── Meta por Empresa ───────────────────────────────────────────────────────

export interface MetaEmpresaDto {
  empresaId: number | null;
  empresaTipo: string;
  empresaNombre: string;
  promedioTrabajadores: number;
  diasLaborados: number;
  esActiva: boolean;

  metaRacs: number;
  metaOpt: number;
  metaAts: number;
  metaCharlas: number;
  metaInspecciones: number;

  actualRacs: number;
  actualRacsAtribuidos: number;
  actualRacsCerrados: number;
  actualOpt: number;
  actualAts: number;
  actualCharlas: number;
  actualInspecciones: number;

  pctRacs: number;
  pctRacsCerrados: number;
  pctOpt: number;
  pctAts: number;
  pctCharlas: number;
  pctInspecciones: number;
  pctProactivoGeneral: number;

  esOculto: boolean;
  puedeOcultarse: boolean;
}

// ─── Checklists por Proyecto ─────────────────────────────────────────────────

export interface ChecklistResumenDto {
  id: number;
  nombre: string;
  porcentaje: number;
  estado: 'pendiente' | 'en_progreso' | 'completado';
  esObligatorio: boolean;
  totalItems: number;
  itemsCompletados: number;
}

// ─── Indicadores por Proyecto (Dashboard de Seguimiento) ───────────────────

export interface IndicadorProactivoProyectoDto {
  proyectoId: number;
  proyectoNombre: string;
  totalEmpresasActivas: number;

  metaRacsTotal: number;
  metaOptTotal: number;
  metaAtsTotal: number;
  metaCharlasTotal: number;
  metaInspeccionesTotal: number;

  actualRacsTotal: number;
  /** RACs atribuidos al proyecto — base contra la que se mide el cierre (distinto de los reportados). */
  actualRacsAtribuidosTotal: number;
  actualRacsCerradosTotal: number;
  actualOptTotal: number;
  actualAtsTotal: number;
  actualCharlasTotal: number;
  actualInspeccionesTotal: number;

  pctRacs: number;
  pctRacsCerrados: number;
  pctOpt: number;
  pctAts: number;
  pctCharlas: number;
  pctInspecciones: number;
  pctProactivoGeneral: number;

  empresas: MetaEmpresaDto[];
  checklists: ChecklistResumenDto[];
}

// ─── Indicadores Reactivos ──────────────────────────────────────────────────

export interface IndicadorReactivoProyectoDto {
  proyectoId: number;
  proyectoNombre: string;
  mes: number;
  anio: number;

  // Mes consultado
  horasHombreTrabajadas: number;
  totalAccidentes: number;
  totalDiasPerdidos: number;
  indiceFrecuencia: number;
  indiceGravedad: number;
  indiceAccidentabilidad: number;

  // Año consultado (enero-diciembre)
  horasHombreTrabajadasAnio: number;
  totalAccidentesAnio: number;
  totalDiasPerdidosAnio: number;
  indiceFrecuenciaAnio: number;
  indiceGravedadAnio: number;
  indiceAccidentabilidadAnio: number;

  // Histórico completo del proyecto
  horasHombreTrabajadasTotal: number;
  totalAccidentesTotal: number;
  totalDiasPerdidosTotal: number;
  indiceFrecuenciaTotal: number;
  indiceGravedadTotal: number;
  indiceAccidentabilidadTotal: number;
}

// ─── Meta Anual de Reactivos ────────────────────────────────────────────────

export interface MetaAnualDto {
  anio: number;
  metaIndiceFrecuencia: number | null;
  metaIndiceGravedad: number | null;
  metaIndiceAccidentabilidad: number | null;
}

export interface GuardarMetaAnualRequest {
  anio: number;
  metaIndiceFrecuencia: number | null;
  metaIndiceGravedad: number | null;
  metaIndiceAccidentabilidad: number | null;
}

// ─── Puntaje del Mes ────────────────────────────────────────────────────────

export interface PuntajeMesDto {
  proyectoId: number;
  proyectoNombre: string;
  mes: number;
  anio: number;

  pctProactivos: number;
  pctPasso: number;
  pctCierreAccidentes: number;
  pctCierreHallazgos: number;

  puntajeProactivos: number;
  puntajePasso: number;
  puntajeCierreAccidentes: number;
  puntajeCierreHallazgos: number;
  bonusProactivos: number;
  puntajeTotal: number;

  accidentesAbiertos: number;
  accidentesTotales: number;
  hallazgosCerrados: number;
  hallazgosTotales: number;
}
