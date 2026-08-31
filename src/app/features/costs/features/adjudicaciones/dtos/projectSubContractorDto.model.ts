import { WorkItemValorizationFormSimpleDTO } from "./workItemSimple.model";

export interface ProjectSubContractorFileDTO {
  /** Solo viene en cotizaciones y cuadros comparativos (colecciones editables del paso 1). */
  fileId?: number;
  fileUrl: string;
  originalFileName?: string;
  statusId?: number | null;
  statusDescription?: string | null;
  observation?: string | null;
}

export interface ProjectSubContractorDTO {
  projectSubContractorId: number;
  projectId: number;
  projectDescription: string;
  contractorId: number;
  contributorId: number;
  contributorName: string;
  contractTypeId: number;
  contractTypeDescription: string;
  contractModalityId?: number | null;
  contractModalityDescription?: string | null;
  paymentMethodId: number;
  paymentMethodDescription: string;
  paymentFormId?: number | null;
  paymentFormDescription?: string | null;
  includesCartaFianza?: boolean;
  advancePercentage?: number;
  advanceAmount?: number | null;
  termDays?: number | null;
  amount: number;
  currencyId: number;
  currencyCode: string;
  amountHasIgv: boolean;
  contractorEmails: string[];
  workItemId: number;
  workItemDescription: string;
  isSubcontract?: boolean;
  isLabor?: boolean;
  contractWorkItemName?: string | null;
  workItemCategoryId: number;
  workItemCategoryDescription: string;
  workItemCategoryInstructivosSyncStatus?: number | null; // 1=automático, 2=manual, 3=sin instructivo
  workItemCategoryInstructivosFolderName?: string | null;
  workItemValorizationForms?: WorkItemValorizationFormSimpleDTO[];
  workSpecialtyId?: number | null;
  workSpecialtyDescription?: string | null;
  createdDateTime: string;
  createdUserFullName?: string;
  quotationFiles: ProjectSubContractorFileDTO[];
  comparativeFiles: ProjectSubContractorFileDTO[];
  projectSubContractorStatusId: number;
  projectSubContractorStatusDescription: string;
  signingDate?: string;
  startDate?: string;
  endDate?: string;
  contractNumber?: number | null;
  promissoryNoteNumber?: number | null;
  guaranteeFundPercentage?: number | null;
  guaranteeFundDays?: number | null;
  guaranteeValidityDays?: number | null;
  /** Forma de pago en días hábiles (paso 2) — "pago a x días hábiles" en la hoja resumen */
  paymentDays?: number | null;
  arrivedWithObservations?: boolean | null;
  arrivalObservation?: string | null;
  // Procesos de firma (paso 6)
  step6SignedCostos?: boolean;
  step6SignedGerenteInmobiliario?: boolean;
  step6SignedGerenteGeneral?: boolean;
  // Documentos del contrato (paso 3)
  contract?: ProjectSubContractorFileDTO;
  summarySheet?: ProjectSubContractorFileDTO;
  budget?: ProjectSubContractorFileDTO;
  schedule?: ProjectSubContractorFileDTO;
  attachedQuotation?: ProjectSubContractorFileDTO;
  serviceOrder?: ProjectSubContractorFileDTO;
  promissoryNote?: ProjectSubContractorFileDTO;  // solo si paymentMethodId === 2
  // Paquete del contrato completo (paso 4 — autogenerado: Hoja Resumen + Contrato + Pagaré)
  package?: ProjectSubContractorFileDTO;
  // Instructivo (paso 3 — obtenido desde OneDrive de Calidad)
  instructivo?: ProjectSubContractorFileDTO;
  // Salidas no conforme y cuadro de tolerancias (paso 3 — solo subida)
  nonConformingOutput?: ProjectSubContractorFileDTO;
  toleranceChart?: ProjectSubContractorFileDTO;
  finishProtection?: ProjectSubContractorFileDTO;
  // Ficha técnica y anexos (paso 3 — solo subida)
  fichaTecnica?: ProjectSubContractorFileDTO;
  anexo?: ProjectSubContractorFileDTO;
  // Documentos escaneados (paso 7)
  scannedDoc1?: ProjectSubContractorFileDTO;
  scannedDoc2?: ProjectSubContractorFileDTO;
  scannedDoc3?: ProjectSubContractorFileDTO;
}
