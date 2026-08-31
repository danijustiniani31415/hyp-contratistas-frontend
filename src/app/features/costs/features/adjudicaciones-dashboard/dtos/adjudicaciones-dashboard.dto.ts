export interface AdjChartItemDTO {
  id: number;
  label: string;
  value: number;
  /** Detalle breve por ítem ("CONTRATISTA — PARTIDA"); solo llega en porEstado (tooltip de la barra). */
  items?: string[];
}

/** Ítem para gráficos de doble barra: monto total adjudicado + monto del adelanto. */
export interface AdjAdvanceChartItemDTO {
  id: number;
  label: string;
  total: number;
  advance: number;
}

export interface AdjMoneyByCurrencyDTO {
  code: string;
  symbol: string;
  total: number;
}

export interface AdjDashboardSummaryDTO {
  total: number;
  completadas: number;
  enProceso: number;
  totalProyectos: number;
  montoPenTotal: number;
  montoUsdTotal: number;
  plazoPromedioDias: number;
}

export interface AdjOptionDTO {
  id: number;
  label: string;
}

export interface AdjDashboardFiltersDTO {
  projects: AdjOptionDTO[];
  contractTypes: AdjOptionDTO[];
  contractModalities: AdjOptionDTO[];
  paymentMethods: AdjOptionDTO[];
  statuses: AdjOptionDTO[];
}

/** Valores seleccionados en los filtros del dashboard (null = sin filtrar). */
export interface AdjDashboardFilterValues {
  projectId: number | null;
  contractTypeId: number | null;
  contractModalityId: number | null;
  paymentMethodId: number | null;
  projectSubContractorStatusId: number | null;
}

export interface AdjudicacionesDashboardDTO {
  /** Catálogos de filtros; solo llega en la primera carga. */
  filters?: AdjDashboardFiltersDTO;
  summary: AdjDashboardSummaryDTO;
  porEstado: AdjChartItemDTO[];
  montoPorMoneda: AdjMoneyByCurrencyDTO[];
  topSubcontratistasPen: AdjChartItemDTO[];
  topSubcontratistasUsd: AdjChartItemDTO[];
  /** Top por monto solo de contratos con adelanto (Contrato con adelanto / Pago a cuenta). */
  topSubcontratistasAdelantoPen: AdjAdvanceChartItemDTO[];
  topSubcontratistasAdelantoUsd: AdjAdvanceChartItemDTO[];
  /** Adjudicaciones pendientes por trabajador de OT (traen items = "RAZÓN SOCIAL — PARTIDA"). */
  pendientesOtPaso2: AdjChartItemDTO[];
  pendientesOtPaso4: AdjChartItemDTO[];
}
