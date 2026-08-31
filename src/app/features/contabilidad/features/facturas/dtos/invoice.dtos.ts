export interface InvoiceDto {
  invoiceId: number;
  issueDate: string;
  serie: string;
  correlativo: string;
  invoiceNumber: string;
  contributorId: number;
  contributorRuc: string;
  contributorName: string;
  abrilContributorId?: number | null;
  abrilContributorName?: string | null;
  description: string;
  invoicePaymentFormId: number;
  invoicePaymentFormDescription: string;
  total: number;
  currencyId?: number | null;
  currencyCode?: string | null;
  currencySymbol?: string | null;
  invoiceStatusId?: number | null;
  invoiceStatusDescription?: string | null;
  invoiceObservationReasonId?: number | null;
  invoiceObservationReasonDescription?: string | null;
  documentUrl?: string | null;
  signedDocumentUrl?: string | null;
  createdDateTime: string;
}

/** Grupo de facturas por razón social de Abril (vista de bloques). */
export interface InvoiceBlockGroupDto {
  abrilName: string;
  count: number;
  items: InvoiceDto[];
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export interface InvoiceChartItemDto {
  label: string;
  total: number;
  count: number;
  year: number;
  month: number;
}

export interface InvoiceCurrencyTotalDto {
  currencyCode: string;
  currencySymbol?: string | null;
  total: number;
  count: number;
}

export interface InvoiceDashboardDto {
  totalCount: number;
  totalsByCurrency: InvoiceCurrencyTotalDto[];
  byMonth: InvoiceChartItemDto[];
  byPaymentForm: InvoiceChartItemDto[];
  byAbril: InvoiceChartItemDto[];
  topSuppliers: InvoiceChartItemDto[];
}

export interface InvoiceDashboardInitDto {
  suppliers: InvoiceSupplierDto[];
  paymentForms: InvoicePaymentFormDto[];
  abrilCompanies: InvoiceSupplierDto[];
  currencies: InvoiceCurrencyDto[];
  dashboard: InvoiceDashboardDto;
}

/** Moneda para el desplegable del formulario. */
export interface InvoiceCurrencyDto {
  currencyId: number;
  currencyCode: string;
  currencyDescription: string;
  currencySymbol?: string | null;
}

/** Detalle completo de una factura (modal ver/editar). */
export interface InvoiceDetailDto {
  invoiceId: number;
  issueDate: string;
  serie: string;
  correlativo: string;
  invoiceNumber: string;
  contributorId: number;
  contributorRuc: string;
  contributorName: string;
  abrilContributorId?: number | null;
  abrilContributorName?: string | null;
  abrilContributorRuc?: string | null;
  description: string;
  invoicePaymentFormId: number;
  invoicePaymentFormDescription: string;
  total: number;
  currencyId?: number | null;
  currencyCode?: string | null;
  currencySymbol?: string | null;
  invoiceStatusId?: number | null;
  invoiceStatusDescription?: string | null;
  invoiceObservationReasonId?: number | null;
  invoiceObservationReasonDescription?: string | null;
  invoiceFolderName?: string | null;
  documentUrl?: string | null;
  signedDocumentUrl?: string | null;
  createdDateTime: string;
  updatedDateTime?: string | null;
}

export interface InvoiceSupplierDto {
  contributorId: number;
  contributorRuc: string;
  contributorName: string;
}

export interface InvoicePaymentFormDto {
  invoicePaymentFormId: number;
  invoicePaymentFormDescription: string;
}

/** Motivo de observación para el desplegable del modal "Observar". */
export interface InvoiceObservationReasonDto {
  invoiceObservationReasonId: number;
  invoiceObservationReasonDescription: string;
}

export interface InvoiceFilterDto {
  search?: string | null;
  serie?: string | null;
  correlativo?: string | null;
  contributorId?: number | null;
  contributorRuc?: string | null;
  abrilContributorId?: number | null;
  abrilContributorRuc?: string | null;
  invoicePaymentFormId?: number | null;
  currencyId?: number | null;
  totalMin?: number | null;
  totalMax?: number | null;
  issueDateFrom?: string | null;
  issueDateTo?: string | null;
  page: number;
  /** Columna por la que ordenar la tabla; null = orden original (más recientes primero). */
  sortBy?: string | null;
  /** Dirección del orden: 'asc' o 'desc'. */
  sortDir?: 'asc' | 'desc' | null;
}

export interface PagedResponseDTO<T> {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  data: T[];
}

export interface InvoiceInitDto {
  suppliers: InvoiceSupplierDto[];
  paymentForms: InvoicePaymentFormDto[];
  /** Razones sociales que maneja Abril (contribuyentes con es_abril = true). */
  abrilCompanies: InvoiceSupplierDto[];
  currencies: InvoiceCurrencyDto[];
  /** Motivos de observación para el modal "Observar". */
  observationReasons: InvoiceObservationReasonDto[];
  invoices: PagedResponseDTO<InvoiceDto>;
}

/** Respuesta de la consulta RUC a SUNAT (para el modal de nuevo proveedor). */
export interface SunatContributorDTO {
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorEconomicActivityDescription: string;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
}

/** Datos para dar de alta un nuevo proveedor. */
export interface InvoiceSupplierCreateDto {
  contributorRuc: string;
  contributorName: string;
  contributorAddress: string;
  contributorEconomicActivityDescription?: string | null;
  contributorDistrict?: string | null;
  contributorProvince?: string | null;
  contributorDepartment?: string | null;
}
