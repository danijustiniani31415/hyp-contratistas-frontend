import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../../../shared/components/date-picker/date-picker';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { FilePreview, FilePreviewItem } from '../../../../../../shared/components/file-preview/file-preview';
import { CronogramaModal } from './cronograma/cronograma-modal';
import { ProjectSubContractorDTO, ProjectSubContractorFileDTO } from '../../dtos/projectSubContractorDto.model';
import { ProjectSubContractorFormDataDTO } from '../../dtos/projectSubContractorFormDataDTO.model';
import { AdjudicacionesService } from '../../services/adjudicaciones.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { MicrosoftAuthService } from '../../../../../auth/pages/login/services/microsoft-auth.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { Roles } from '../../../../../../core/constants/roles';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { buildContractPartidaName } from '../../utils/contract-partida-name';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, DatePicker, CronogramaModal, FileSelector, FilePreview],
  templateUrl: './detail.html',
  styleUrl: './detail.css',
})
export class Detail implements OnInit {
  @Input() item!: ProjectSubContractorDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<void>();

  @ViewChild('fileInput')       fileInput!:       ElementRef<HTMLInputElement>;
  @ViewChild('fileInputStep4')  fileInputStep4!:  ElementRef<HTMLInputElement>;
  @ViewChild('fileInputStep7')  fileInputStep7!:  ElementRef<HTMLInputElement>;

  readonly steps = [
    'Por notificar',
    'Datos del contrato',
    'Preparación de documentos',
    'Por enviar al SC',
    'Llegada a Of. Central',
    'Procesos de firma',
    'Por escanear',
    'Envío a obra',
    'Completado',
  ];

  readonly totalSteps = this.steps.length;

  /**
   * Oficina responsable de avanzar DESDE cada paso (para colorear el stepper):
   * naranja = Oficina Técnica, verde = Oficina Central. El último paso es terminal.
   */
  private readonly stepOfficeMap: Record<number, 'central' | 'tecnica'> = {
    1: 'central', // Por notificar — OC notifica al SC
    2: 'tecnica', // Datos del contrato — OT
    3: 'central', // Preparación de documentos — OC aprueba
    4: 'tecnica', // Por enviar al SC — OT
    5: 'central', // Llegada a Of. Central — OC
    6: 'central', // Procesos de firma — OC
    7: 'central', // Por escanear — OC
    8: 'central', // Envío a obra — OC
  };

  /** Oficina responsable de avanzar desde ese paso ('done' para el paso final). */
  stepOffice(step: number): 'central' | 'tecnica' | 'done' {
    return step >= this.totalSteps ? 'done' : this.stepOfficeMap[step] ?? 'central';
  }

  /** Color del paso según la oficina responsable: verde = Of. Central, naranja = Of. Técnica. */
  stepColor(step: number): string {
    switch (this.stepOffice(step)) {
      case 'tecnica':
        return '#F59E0B';
      case 'central':
        return 'var(--color-abril-primary)';
      default:
        return '#9CA3AF';
    }
  }

  /** Paso que se está mostrando en pantalla (navegable). */
  viewStep = 1;

  /** Formulario del paso 2. */
  step2Form = { signingDate: '', startDate: '', endDate: '', contractNumber: null as number | null, promissoryNoteNumber: null as number | null, guaranteeFundPercentage: 5 as number | null, guaranteeFundDays: 365 as number | null, guaranteeValidityDays: 365 as number | null, paymentDays: 7 as number | null };

  // ── Edición de pasos 1 y 2 (solo mientras la adjudicación esté en pasos 1–4) ──
  /** Catálogos para los desplegables de edición del paso 1. Se cargan bajo demanda. */
  formData: ProjectSubContractorFormDataDTO | null = null;
  step1EditMode = false;
  step2EditMode = false;
  step1Form = {
    projectId: 0, contractorId: 0, contractTypeId: 0, contractModalityId: null as number | null,
    paymentMethodId: 0, paymentFormId: null as number | null, includesCartaFianza: false,
    advancePercentage: null as number | null,
    amount: 0, currencyId: 0, hasIgv: true, workItemId: 0, workItemCategoryId: 0,
    workSpecialtyId: null as number | null,
    isSubcontract: false, isLabor: false, contractWorkItemName: '',
  };
  /** Se activa cuando el usuario edita manualmente el nombre final; corta la regeneración automática. */
  step1NameManuallyEdited = false;
  step1ContractorEmails: string[] = [];
  step1AdvanceAmount: number | undefined = undefined;

  // ── Archivos del paso 1 en modo edición ─────────────────────────────────
  // Mismos topes que en el alta: 3 cotizaciones y 1 cuadro comparativo.
  readonly maxQuotationFiles = 3;
  readonly maxComparativeFiles = 1;
  /** Archivos ya guardados que siguen en pantalla (los quitados salen de esta lista). */
  step1ExistingQuotationFiles: ProjectSubContractorFileDTO[] = [];
  step1ExistingComparativeFiles: ProjectSubContractorFileDTO[] = [];
  /** Ids de los archivos guardados que el usuario quitó; se envían para su soft delete. */
  step1RemovedQuotationFileIds: number[] = [];
  step1RemovedComparativeFileIds: number[] = [];
  /** Archivos nuevos por subir + su vista previa. */
  step1NewQuotationFiles: File[] = [];
  step1NewComparativeFiles: File[] = [];
  step1NewQuotationItems: FilePreviewItem[] = [];
  step1NewComparativeItems: FilePreviewItem[] = [];

  /** Opciones No/Sí para el search-select de carta de fianza. */
  readonly cartaFianzaOptions = [
    { value: false, label: 'No' },
    { value: true, label: 'Sí' },
  ];

  /**
   * Solo se puede editar la info de paso 1 mientras la adjudicación esté en pasos 1–4.
   * Solo Oficina Central (o el Administrador) puede llenar los campos del paso 1.
   */
  get canEditInfo(): boolean {
    return this.actualStatus <= 4 && this.hasOfCentral;
  }

  /**
   * Datos del contrato (paso 2): los llena y edita Oficina Técnica (o el Administrador)
   * mientras la adjudicación esté en pasos 1–4. Es quien avanza del paso 2 al 3.
   */
  get canEditStep2(): boolean {
    return this.actualStatus <= 4 && this.hasOfTecnica;
  }

  /** Documentos del paso 3. Se inicializa una sola vez en ngOnInit para evitar re-renders. */
  documents: { key: string; label: string }[] = [];

  /** Documentos del paso 7 (1 slot). */
  readonly scannedDocuments: { key: string; label: string }[] = [
    { key: 'ScannedDoc1', label: 'Documento escaneado' },
  ];

  trackByDocKey(_: number, doc: { key: string }): string {
    return doc.key;
  }

  /**
   * Modalidades de pago que generan pagaré: "Contrato con adelanto" (2) y "Pago a cuenta" (4).
   * El adelanto y la carta de fianza siguen siendo exclusivos de la modalidad 2.
   */
  get requiresPromissoryNote(): boolean {
    return this.item.paymentMethodId === 2 || this.item.paymentMethodId === 4;
  }

  private buildDocuments(): { key: string; label: string }[] {
    const base = [
      { key: 'Contract',          label: 'Contrato' },
      { key: 'SummarySheet',      label: 'Hoja Resumen' },
      { key: 'Schedule',          label: 'Cronograma' },
      { key: 'AttachedQuotation', label: 'Cotización Adjunta' },
      { key: 'ServiceOrder',      label: 'Orden de Servicio' },
      { key: 'Instructivo',          label: 'Instructivo' },
      { key: 'NonConformingOutput',  label: 'Causales de No Conformidad' },
      { key: 'ToleranceChart',       label: 'Cuadro de Tolerancias' },
      { key: 'FinishProtection',     label: 'Protección de Acabados' },
      { key: 'FichaTecnica',         label: 'Ficha Técnica' },
      { key: 'Anexo',                label: 'Anexos' },
    ];
    if (this.requiresPromissoryNote) {
      return [...base, { key: 'PromissoryNote', label: 'Pagaré' }];
    }
    return base;
  }

  /** Paso 4 — archivo en memoria hasta que se envía */
  step4File: File | null = null;

  /** Paso 4 — indica que el paquete PDF se está generando */
  generatingPackage = false;

  /** Paso 7 — clave de doc de escaneados siendo subido en este momento */
  currentScannedDocType: string | null = null;

  /** Paso 5 — opción de llegada y subsanación */
  step5ArrivalOption: 'complete' | 'with_observations' | null = null;
  step5ArrivalObservation = '';
  step5ObservationsResolved = false;
  /** Paso 5 — mensaje opcional de Of. Técnica al notificar el levantamiento de observaciones. */
  step5LevantamientoMessage = '';
  sendingStep5Observations = false;
  sendingStep5Levantamiento = false;

  /** Paso 6 — confirmación de firmas */
  step6ConfirmedOriundo = false;
  step6ConfirmedToratto = false;
  step6ConfirmedCostos  = false;
  get step6AllConfirmed(): boolean { return this.step6ConfirmedOriundo && this.step6ConfirmedToratto && this.step6ConfirmedCostos; }

  currentDocType: string | null = null;
  uploadingDoc: string | null = null;
  generatingDoc: string | null = null;
  updatingStatusDoc: string | null = null;
  sendingObservationEmail: string | null = null;
  sendingAllObservationsEmail = false;
  sendingAllLevantamientoEmail = false;
  sendingContractReview = false;

  /** Opciones de estado para los documentos (varía según rol). */
  isOfTecnica = false;
  fileStatuses: { id: number; label: string }[] = [];

  hasOfTecnica = false;
  hasOfCentral = false;
  hasAdmin = false;

  /** Formulario local de estado/observación por clave de documento. */
  docForms: Record<string, { statusId: number | null; observation: string }> = {};

  /** Tipos de documento que ya tienen generación implementada en el backend. */
  private readonly generableKeys = new Set(['SummarySheet', 'Contract', 'PromissoryNote', 'Instructivo', 'Schedule']);

  /** Modal del armado del cronograma (paso 3 — documento "Cronograma"). */
  showCronogramaModal = false;

  /**
   * Documentos que NO se suben ni generan: usan un PDF de plantilla fijo del servidor.
   * Solo se controla su estado con dos opciones: Aprobado (4) / No aplica (1).
   */
  private readonly templateDocs = new Set(['NonConformingOutput', 'ToleranceChart', 'FinishProtection']);

  isTemplateDoc(key: string): boolean {
    return this.templateDocs.has(key);
  }

  constructor(
    private adjudicacionesService: AdjudicacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private microsoftAuthService: MicrosoftAuthService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // El Administrador de Costos y Presupuestos tiene acceso total: equivale a tener ambos roles.
    this.hasAdmin     = this.authService.hasRole(Roles.COSTOS_ADMINISTRADOR);
    this.hasOfTecnica = this.authService.hasRole(Roles.COSTOS_OFICINA_TECNICA) || this.hasAdmin;
    this.hasOfCentral = this.authService.hasRole(Roles.COSTOS_OFICINA_CENTRAL) || this.hasAdmin;

    // Solo OF Técnica (sin Central): opciones restringidas
    this.isOfTecnica = this.hasOfTecnica && !this.hasOfCentral;

    const centralOptions = [
      { id: 1, label: 'No aplica' },
      { id: 2, label: 'En revisión por Ofic. Centr.' },
      { id: 3, label: 'Con observaciones' },
      { id: 4, label: 'Aprobado' },
    ];
    const levantamientoOption = { id: 5, label: 'Levantamiento de observación' };

    if (this.hasOfTecnica && this.hasOfCentral) {
      // Ambos roles → las 5 opciones
      this.fileStatuses = [...centralOptions, levantamientoOption];
    } else if (this.hasOfTecnica) {
      // Solo OF Técnica → opciones se calculan por documento en getStatusOptionsForDoc()
      this.fileStatuses = [{ id: 1, label: 'No aplica' }, levantamientoOption];
    } else {
      // Solo OF Central u otro rol → las 4 opciones estándar
      this.fileStatuses = centralOptions;
    }

    this.viewStep = this.item.projectSubContractorStatusId;
    if (this.item.signingDate)    this.step2Form.signingDate    = this.item.signingDate.substring(0, 10);
    if (this.item.startDate)      this.step2Form.startDate      = this.item.startDate.substring(0, 10);
    if (this.item.endDate)        this.step2Form.endDate        = this.item.endDate.substring(0, 10);
    if (this.item.contractNumber)        this.step2Form.contractNumber        = this.item.contractNumber;
    if (this.item.promissoryNoteNumber)  this.step2Form.promissoryNoteNumber  = this.item.promissoryNoteNumber;
    if (this.item.guaranteeFundPercentage != null) this.step2Form.guaranteeFundPercentage = this.item.guaranteeFundPercentage;
    if (this.item.guaranteeFundDays != null)       this.step2Form.guaranteeFundDays       = this.item.guaranteeFundDays;
    if (this.item.guaranteeValidityDays != null)   this.step2Form.guaranteeValidityDays   = this.item.guaranteeValidityDays;
    if (this.item.paymentDays != null)             this.step2Form.paymentDays             = this.item.paymentDays;
    this.documents = this.buildDocuments();
    this.initDocForms();
    if (this.item.projectSubContractorStatusId >= 5 && this.item.arrivedWithObservations != null) {
      this.step5ArrivalOption = this.item.arrivedWithObservations ? 'with_observations' : 'complete';
    }
    this.step5ArrivalObservation = this.item.arrivalObservation ?? '';
    // Paso 6 — estado persistido en BD (las adjudicaciones antiguas que ya pasaron
    // el paso 6 pueden no tener los flags guardados: se asumen confirmadas).
    const step6Done = this.item.projectSubContractorStatusId > 6;
    this.step6ConfirmedOriundo  = step6Done || !!this.item.step6SignedGerenteInmobiliario;
    this.step6ConfirmedToratto  = step6Done || !!this.item.step6SignedGerenteGeneral;
    this.step6ConfirmedCostos   = step6Done || !!this.item.step6SignedCostos;
  }

  private initDocForms(): void {
    for (const doc of this.documents) {
      const file = this.getDocFile(doc.key);
      this.docForms[doc.key] = {
        statusId:    file?.statusId    ?? null,
        observation: file?.observation ?? '',
      };
    }
  }

  /** Estado real del item en el backend. */
  get actualStatus(): number {
    return this.item.projectSubContractorStatusId;
  }

  /** Solo Oficina Técnica puede enviar al SC (avanzar del paso 4 al 5). */
  get canSendToSc(): boolean {
    return this.hasOfTecnica;
  }

  /** Solo Oficina Central puede marcar la llegada y confirmar la recepción (paso 5 → 6). */
  get canConfirmArrival(): boolean {
    return this.hasOfCentral;
  }

  /** Plazo en días calculado desde el formulario (paso 2 en edición). */
  get plazoEnDias(): number | null {
    if (!this.step2Form.startDate || !this.step2Form.endDate) return null;
    const diff = new Date(this.step2Form.endDate).getTime() - new Date(this.step2Form.startDate).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }

  /** Plazo en días calculado desde los datos guardados (paso 2 en lectura). */
  get storedPlazoEnDias(): number | null {
    if (!this.item.startDate || !this.item.endDate) return null;
    const diff = new Date(this.item.endDate).getTime() - new Date(this.item.startDate).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }

  /** True cuando al menos un documento escaneado ha sido subido. */
  get hasAnyScannedDoc(): boolean {
    return this.scannedDocuments.some(doc => this.hasDocFile(doc.key));
  }

  /**
   * True cuando cada documento tiene un estado que permite avanzar:
   *   • statusId === 1 (No aplica) → no requiere archivo.
   *   • statusId === 4 (Aprobado)  → requiere archivo subido.
   * Cualquier otro estado (null, 2, 3) bloquea el avance.
   */
  get allDocsApproved(): boolean {
    return this.documents.every(doc => {
      const statusId = this.docForms[doc.key]?.statusId;
      // Documentos de plantilla: Aprobado no requiere archivo subido (usan PDF estándar).
      if (this.isTemplateDoc(doc.key)) {
        return statusId === 1 || statusId === 4;
      }
      return statusId === 1 || (statusId === 4 && this.hasDocFile(doc.key));
    });
  }

  /** El contrato (obligatorio) debe estar Aprobado (estado 4) y tener archivo subido. */
  get contractApproved(): boolean {
    return this.docForms['Contract']?.statusId === 4 && this.hasDocFile('Contract');
  }

  get forwardLabel(): string {
    if (this.actualStatus === 1) return 'Enviar correos';
    if (this.actualStatus === 2 && this.viewStep === 2) return 'Guardar y continuar';
    if (this.actualStatus === 3 && this.viewStep === 3) return 'Marcar como aprobado';
    if (this.actualStatus === 4 && this.viewStep === 4) return 'Enviar al SC';
    if (this.actualStatus === 5 && this.viewStep === 5) return 'Confirmar recepción';
    if (this.actualStatus === 6 && this.viewStep === 6) return 'Confirmar y enviar correo';
    if (this.actualStatus === 7 && this.viewStep === 7) return 'Marcar como escaneado';
    if (this.actualStatus === 8 && this.viewStep === 8) return 'Enviar a Staff de Obra';
    return 'Siguiente paso';
  }

  canGoBack(): boolean {
    return this.viewStep > 1;
  }

  /** True si la adjudicación tiene al menos una cotización guardada (requisito para notificar). */
  get hasQuotationFile(): boolean {
    return !!this.item.quotationFiles?.length;
  }

  canGoForward(): boolean {
    // Solo Oficina Central (o Administrador) puede llenar y avanzar los pasos 1 y 2.
    // La cotización es el adjunto del correo de notificación, así que sin ella no se puede avanzar
    // (al crear la adjudicación sí es opcional). El cuadro comparativo nunca es obligatorio.
    if (this.actualStatus === 1) return this.hasOfCentral && this.hasQuotationFile;
    if (this.actualStatus === 2 && this.viewStep === 2) {
      if (!this.hasOfTecnica) return false;
      const baseOk = !!(
        this.step2Form.signingDate &&
        this.step2Form.startDate &&
        this.step2Form.endDate &&
        this.step2Form.contractNumber != null && (this.step2Form.contractNumber as any) !== '' &&
        this.step2Form.guaranteeFundPercentage != null && (this.step2Form.guaranteeFundPercentage as any) !== '' &&
        this.step2Form.guaranteeFundDays != null && (this.step2Form.guaranteeFundDays as any) !== ''
      );
      if (!baseOk) return false;
      if (this.requiresPromissoryNote) {
        return this.step2Form.promissoryNoteNumber != null && (this.step2Form.promissoryNoteNumber as any) !== '';
      }
      return true;
    }
    if (this.actualStatus === 3 && this.viewStep === 3) {
      // Solo Oficina Central (o Administrador) puede aprobar y avanzar el paso 3.
      if (!this.hasOfCentral) return false;
      // Al menos el Contrato debe estar Aprobado para poder avanzar.
      return this.allDocsApproved && this.contractApproved;
    }
    if (this.actualStatus === 4 && this.viewStep === 4) {
      // Solo Oficina Técnica puede enviar al SC (avanzar del paso 4 al 5).
      if (!this.hasOfTecnica) return false;
      return this.step4File !== null || !!this.item.package;
    }
    if (this.actualStatus === 5 && this.viewStep === 5) {
      // Solo Oficina Central puede confirmar la recepción (avanzar del paso 5 al 6).
      if (!this.hasOfCentral) return false;
      if (this.step5ArrivalOption === 'complete') return true;
      if (this.step5ArrivalOption === 'with_observations') return this.step5ObservationsResolved;
      return false;
    }
    if (this.actualStatus === 6 && this.viewStep === 6) {
      // Solo Oficina Central (o Administrador) puede marcar las firmas y avanzar.
      return this.hasOfCentral && this.step6AllConfirmed;
    }
    if (this.actualStatus === 7 && this.viewStep === 7) {
      // Solo Oficina Central (o Administrador) puede subir el escaneado y avanzar.
      return this.hasOfCentral && this.hasAnyScannedDoc;
    }
    if (this.actualStatus === 8 && this.viewStep === 8) {
      // Solo Oficina Central (o Administrador) puede enviar a obra y avanzar.
      return this.hasOfCentral;
    }
    return this.viewStep < this.actualStatus;
  }

  goToStep(step: number): void {
    if (step <= this.actualStatus) this.viewStep = step;
  }

  goBack(): void {
    if (this.viewStep > 1) this.viewStep--;
  }

  goForward(): void {
    if (this.actualStatus === 1) {
      this.sendNotification();
    } else if (this.actualStatus === 2 && this.viewStep === 2) {
      this.saveStep2Dates();
    } else if (this.actualStatus === 3 && this.viewStep === 3) {
      this.advanceToApproved();
    } else if (this.actualStatus === 4 && this.viewStep === 4) {
      this.sendScNotification();
    } else if (this.actualStatus === 5 && this.viewStep === 5) {
      this.confirmStep5();
    } else if (this.actualStatus === 6 && this.viewStep === 6) {
      this.sendStep6Notification();
    } else if (this.actualStatus === 7 && this.viewStep === 7) {
      this.advanceFromStep7();
    } else if (this.actualStatus === 8 && this.viewStep === 8) {
      this.sendStep8Notification();
    } else {
      if (this.viewStep < this.actualStatus) this.viewStep++;
    }
  }

  /**
   * Devuelve el registro del documento (o undefined si no existe). ⚠️ Puede existir sin
   * archivo: el estado/observación se puede guardar antes de subirlo, y en ese caso el
   * registro llega con `fileUrl` vacío. Para saber si HAY archivo usar `hasDocFile()`.
   */
  getDocFile(key: string): ProjectSubContractorFileDTO | undefined {
    switch (key) {
      case 'Contract':          return this.item.contract          ?? undefined;
      case 'SummarySheet':      return this.item.summarySheet      ?? undefined;
      case 'Schedule':          return this.item.schedule          ?? undefined;
      case 'AttachedQuotation': return this.item.attachedQuotation ?? undefined;
      case 'ServiceOrder':      return this.item.serviceOrder      ?? undefined;
      case 'PromissoryNote':    return this.item.promissoryNote    ?? undefined;
      case 'Instructivo':          return this.item.instructivo          ?? undefined;
      case 'NonConformingOutput':  return this.item.nonConformingOutput  ?? undefined;
      case 'ToleranceChart':       return this.item.toleranceChart       ?? undefined;
      case 'FinishProtection':     return this.item.finishProtection     ?? undefined;
      case 'FichaTecnica':         return this.item.fichaTecnica         ?? undefined;
      case 'Anexo':                return this.item.anexo                ?? undefined;
      case 'ScannedDoc1':          return this.item.scannedDoc1          ?? undefined;
      default: return undefined;
    }
  }

  /** True solo cuando el documento tiene un archivo real subido/generado. */
  hasDocFile(key: string): boolean {
    return !!this.getDocFile(key)?.fileUrl;
  }

  /** Escribe el registro de un documento en el item local (mantiene la vista coherente). */
  private setDocFile(key: string, file: ProjectSubContractorFileDTO): void {
    switch (key) {
      case 'Contract':             this.item.contract             = file; break;
      case 'SummarySheet':         this.item.summarySheet         = file; break;
      case 'Schedule':             this.item.schedule             = file; break;
      case 'AttachedQuotation':    this.item.attachedQuotation    = file; break;
      case 'ServiceOrder':         this.item.serviceOrder         = file; break;
      case 'PromissoryNote':       this.item.promissoryNote       = file; break;
      case 'Instructivo':          this.item.instructivo          = file; break;
      case 'NonConformingOutput':  this.item.nonConformingOutput  = file; break;
      case 'ToleranceChart':       this.item.toleranceChart       = file; break;
      case 'FinishProtection':     this.item.finishProtection     = file; break;
      case 'FichaTecnica':         this.item.fichaTecnica         = file; break;
      case 'Anexo':                this.item.anexo                = file; break;
      case 'ScannedDoc1':          this.item.scannedDoc1          = file; break;
    }
  }

  canGenerate(key: string): boolean {
    return this.generableKeys.has(key);
  }

  generateDoc(docKey: string): void {
    // El cronograma no se autogenera: primero se arma en el modal (actividades + jerarquía).
    if (docKey === 'Schedule') {
      this.showCronogramaModal = true;
      return;
    }
    this.generatingDoc = docKey;
    this.loaderService.show();
    this.adjudicacionesService.generateDocument(this.item.projectSubContractorId, docKey).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.generatingDoc = null;
        const generated: ProjectSubContractorFileDTO = { fileUrl: res.fileUrl, originalFileName: res.originalFileName };
        switch (docKey) {
          case 'Contract':          this.item.contract          = generated; break;
          case 'SummarySheet':      this.item.summarySheet      = generated; break;
          case 'Schedule':          this.item.schedule          = generated; break;
          case 'AttachedQuotation': this.item.attachedQuotation = generated; break;
          case 'ServiceOrder':      this.item.serviceOrder      = generated; break;
          case 'PromissoryNote':    this.item.promissoryNote    = generated; break;
          case 'Instructivo':       this.item.instructivo       = generated; break;
          case 'ScannedDoc1':       this.item.scannedDoc1       = generated; break;
        }
        Swal.fire({ icon: 'success', title: 'Documento generado exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.generatingDoc = null;
        this.errorService.handleError(err);
      },
    });
  }

  /** Tipos de documento que solo admiten archivos Word (.docx / .doc). */
  private static readonly WORD_ONLY_DOCS = new Set(['Instructivo', 'NonConformingOutput', 'ToleranceChart']);

  private static readonly WORD_ACCEPT =
    '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword';

  /** Tipos de documento que solo admiten archivos PDF. */
  private static readonly PDF_ONLY_DOCS = new Set(['AttachedQuotation']);

  private static readonly PDF_ACCEPT = '.pdf,application/pdf';

  triggerUpload(docKey: string): void {
    this.currentDocType = docKey;
    this.fileInput.nativeElement.value = '';
    // Restringir el selector de archivos según el tipo de documento
    if (Detail.WORD_ONLY_DOCS.has(docKey)) {
      this.fileInput.nativeElement.accept = Detail.WORD_ACCEPT;
    } else if (Detail.PDF_ONLY_DOCS.has(docKey)) {
      this.fileInput.nativeElement.accept = Detail.PDF_ACCEPT;
    } else {
      this.fileInput.nativeElement.accept = '';
    }
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.currentDocType) return;
    this.validateAndUploadDoc(this.currentDocType, input.files[0]);
  }

  /** Documento (`doc.key`) sobre el que se está arrastrando un archivo en el paso 3. */
  dragDoc: string | null = null;

  /**
   * Conteo de dragenter/dragleave pendientes por documento. Necesario porque al mover el
   * mouse sobre los elementos hijos de la tarjeta el navegador dispara dragleave del padre
   * seguido de dragenter, y usar solo dragover/dragleave produce un parpadeo del overlay.
   */
  private dragEnterCount: Record<string, number> = {};

  onDocDragEnter(docKey: string, event: DragEvent): void {
    if (this.isTemplateDoc(docKey) || this.uploadingDoc !== null) return;
    event.preventDefault();
    this.dragEnterCount[docKey] = (this.dragEnterCount[docKey] ?? 0) + 1;
    this.dragDoc = docKey;
  }

  onDocDragOver(docKey: string, event: DragEvent): void {
    if (this.isTemplateDoc(docKey) || this.uploadingDoc !== null) return;
    // Necesario para permitir el drop; el estado visual lo maneja dragenter/dragleave.
    event.preventDefault();
  }

  onDocDragLeave(docKey: string, event: DragEvent): void {
    if (this.isTemplateDoc(docKey)) return;
    event.preventDefault();
    const remaining = (this.dragEnterCount[docKey] ?? 1) - 1;
    this.dragEnterCount[docKey] = Math.max(remaining, 0);
    if (this.dragEnterCount[docKey] === 0 && this.dragDoc === docKey) this.dragDoc = null;
  }

  onDocDrop(docKey: string, event: DragEvent): void {
    if (this.isTemplateDoc(docKey) || this.uploadingDoc !== null) return;
    event.preventDefault();
    this.dragEnterCount[docKey] = 0;
    this.dragDoc = null;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.validateAndUploadDoc(docKey, file);
  }

  /** Valida la extensión según el tipo de documento (si aplica) y sube el archivo. */
  private validateAndUploadDoc(docType: string, file: File): void {
    // Validación extra: los documentos Word-only solo permiten .docx / .doc
    if (Detail.WORD_ONLY_DOCS.has(docType)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'docx' && ext !== 'doc') {
        Swal.fire({
          icon: 'error',
          title: 'Formato no permitido',
          text: 'Este documento solo acepta archivos Word (.docx o .doc).',
          confirmButtonColor: '#64BC04',
        });
        return;
      }
    }

    // Validación extra: los documentos PDF-only solo permiten .pdf
    if (Detail.PDF_ONLY_DOCS.has(docType)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf') {
        Swal.fire({
          icon: 'error',
          title: 'Formato no permitido',
          text: 'La cotización adjunta solo acepta archivos PDF (.pdf).',
          confirmButtonColor: '#64BC04',
        });
        return;
      }
    }

    this.uploadDoc(docType, file);
  }

  private uploadDoc(docType: string, file: File): void {
    this.uploadingDoc = docType;
    this.loaderService.show();
    this.adjudicacionesService.uploadDocument(this.item.projectSubContractorId, docType, file).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.uploadingDoc = null;
        const uploaded: ProjectSubContractorFileDTO = { fileUrl: res.fileUrl, originalFileName: res.originalFileName };
        switch (docType) {
          case 'Contract':          this.item.contract          = uploaded; break;
          case 'SummarySheet':      this.item.summarySheet      = uploaded; break;
          case 'Schedule':          this.item.schedule          = uploaded; break;
          case 'AttachedQuotation': this.item.attachedQuotation = uploaded; break;
          case 'ServiceOrder':      this.item.serviceOrder      = uploaded; break;
          case 'PromissoryNote':    this.item.promissoryNote    = uploaded; break;
          case 'Instructivo':          this.item.instructivo          = uploaded; break;
          case 'NonConformingOutput':  this.item.nonConformingOutput  = uploaded; break;
          case 'ToleranceChart':       this.item.toleranceChart       = uploaded; break;
          case 'FichaTecnica':         this.item.fichaTecnica         = uploaded; break;
          case 'Anexo':                this.item.anexo                = uploaded; break;
          case 'ScannedDoc1':          this.item.scannedDoc1          = uploaded; break;
          case 'ScannedDoc2':          this.item.scannedDoc2          = uploaded; break;
          case 'ScannedDoc3':          this.item.scannedDoc3          = uploaded; break;
        }
        Swal.fire({ icon: 'success', title: 'Archivo subido exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.uploadingDoc = null;
        this.errorService.handleError(err);
      },
    });
  }

  /**
   * El estado se persiste SIEMPRE, tenga o no archivo subido: el backend hace upsert del
   * registro del documento (lo crea sin archivo si hace falta). Antes se abandonaba el
   * guardado cuando no había archivo y el estado se perdía al reabrir el detalle.
   */
  onStatusChange(docKey: string): void {
    this.saveDocStatus(docKey);
  }

  /**
   * Opciones de estado para un documento.
   * - Documentos de plantilla (Causales / Cuadro): solo Aprobado y No aplica.
   * - Para OF Técnica devuelve las opciones restringidas.
   */
  getStatusOptionsForDoc(docKey: string): { id: number; label: string }[] {
    if (this.isTemplateDoc(docKey)) {
      return [
        { id: 4, label: 'Si aplica' },
        { id: 1, label: 'No aplica' },
      ];
    }
    return this.fileStatuses;
  }

  /** True si el usuario tiene el rol de OF Técnica (puede enviar correo de levantamiento). */
  get canSendLevantamiento(): boolean {
    return this.hasOfTecnica;
  }

  /** True si al menos un documento está en estado "Con observaciones" (3). */
  get hasAnyObservation(): boolean {
    return this.documents.some(doc => this.docForms[doc.key]?.statusId === 3);
  }

  /** True si al menos un documento está en estado "Levantamiento de observación" (5). */
  get hasAnyLevantamiento(): boolean {
    return this.documents.some(doc => this.docForms[doc.key]?.statusId === 5);
  }

  onObservationBlur(docKey: string): void {
    if (this.isOfTecnica) return;
    this.saveDocStatus(docKey);
  }

  private saveDocStatus(docKey: string): void {
    const form = this.docForms[docKey];
    this.updatingStatusDoc = docKey;
    this.loaderService.show();
    this.adjudicacionesService.updateDocumentStatus(
      this.item.projectSubContractorId,
      docKey,
      { statusId: form.statusId, observation: form.observation || null },
    ).subscribe({
      next: () => {
        this.loaderService.hide();
        this.updatingStatusDoc = null;
        // Actualizar el item local para mantener coherencia. Si el documento todavía no
        // tiene registro (sin archivo subido) se crea uno con `fileUrl` vacío para que el
        // estado sobreviva al cerrar y reabrir el modal sin recargar la lista.
        const file = this.getDocFile(docKey);
        if (file) {
          file.statusId    = form.statusId;
          file.observation = form.observation || null;
        } else {
          this.setDocFile(docKey, {
            fileUrl:     '',
            statusId:    form.statusId,
            observation: form.observation || null,
          });
        }
      },
      error: (err) => {
        this.loaderService.hide();
        this.updatingStatusDoc = null;
        this.errorService.handleError(err);
      },
    });
  }

  async sendObservationsEmail(docKey: string, docLabel: string): Promise<void> {
    this.sendingObservationEmail = docKey;
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      this.sendingObservationEmail = null;
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    const form = this.docForms[docKey];
    this.adjudicacionesService
      .sendObservationEmail(this.item.projectSubContractorId, docKey, {
        graphAccessToken: graphToken,
        documentLabel: docLabel,
        observation: form.observation || null,
      })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          this.sendingObservationEmail = null;
          Swal.fire({
            icon: 'success',
            title: res.message ?? 'Correo enviado exitosamente',
            draggable: true,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.sendingObservationEmail = null;
          this.errorService.handleError(err);
        },
      });
  }

  async sendAllObservationsEmailGlobal(): Promise<void> {
    this.sendingAllObservationsEmail = true;
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      this.sendingAllObservationsEmail = false;
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService
      .sendAllObservationsEmail(this.item.projectSubContractorId, { graphAccessToken: graphToken })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          this.sendingAllObservationsEmail = false;
          Swal.fire({
            icon: 'success',
            title: res.message ?? 'Correo enviado exitosamente',
            draggable: true,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.sendingAllObservationsEmail = false;
          this.errorService.handleError(err);
        },
      });
  }

  async sendAllLevantamientoEmailGlobal(): Promise<void> {
    this.sendingAllLevantamientoEmail = true;
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      this.sendingAllLevantamientoEmail = false;
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService
      .sendAllLevantamientoEmail(this.item.projectSubContractorId, { graphAccessToken: graphToken })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          this.sendingAllLevantamientoEmail = false;
          Swal.fire({
            icon: 'success',
            title: res.message ?? 'Correo enviado exitosamente',
            draggable: true,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.sendingAllLevantamientoEmail = false;
          this.errorService.handleError(err);
        },
      });
  }

  /**
   * Paso 3 — Oficina Técnica solicita a Costos el V°B° / comentarios de todos los
   * documentos preparados. Envía un correo (vía Graph, como el usuario autenticado)
   * dirigido únicamente a los miembros de Costos, adjuntando todos los documentos.
   */
  async sendContractReviewEmailGlobal(): Promise<void> {
    this.sendingContractReview = true;
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      this.sendingContractReview = false;
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService
      .sendContractReviewEmail(this.item.projectSubContractorId, { graphAccessToken: graphToken })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          this.sendingContractReview = false;
          Swal.fire({
            icon: 'success',
            title: res.message ?? 'Correo enviado exitosamente',
            draggable: true,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.sendingContractReview = false;
          this.errorService.handleError(err);
        },
      });
  }

  generatePackage(): void {
    // Solo Oficina Técnica (o Administrador) puede generar el contrato completo.
    if (!this.canSendToSc) return;
    this.generatingPackage = true;
    this.loaderService.show();
    this.adjudicacionesService.generateContractPackage(this.item.projectSubContractorId).subscribe({
      next: (response) => {
        this.loaderService.hide();
        this.generatingPackage = false;

        // Unpack the response: bytes, fileUrl, and originalFileName
        const { bytes, fileUrl, originalFileName } = response;

        // Create the File object for local usage (in-memory until sent to SC)
        const blob = new Blob([bytes], { type: 'application/pdf' });
        this.step4File = new File([blob], originalFileName, { type: 'application/pdf' });

        // Store the package info with the SharePoint URL so the template shows the clickable link
        this.item.package = {
          fileUrl,
          originalFileName,
        };

        // Refresh the parent list to ensure the package data is persisted in the database
        // and available when the modal is reopened
        this.statusChanged.emit();

        Swal.fire({
          icon: 'success',
          title: 'Paquete generado',
          text: 'El PDF combinado está listo. Haz clic en "Enviar al SC" para enviarlo.',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.generatingPackage = false;
        // responseType: 'arraybuffer' → err.error es un ArrayBuffer, no JSON.
        // Hay que decodificarlo para leer el mensaje del backend.
        if (err.error instanceof ArrayBuffer) {
          try {
            const text = new TextDecoder().decode(err.error);
            const json = JSON.parse(text);
            Swal.fire({ icon: 'error', title: 'Error', text: json.message ?? 'Ocurrió un error.', draggable: true });
          } catch {
            this.errorService.handleError(err);
          }
        } else {
          this.errorService.handleError(err);
        }
      },
    });
  }

  onStep4FileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.step4File = input.files[0];
  }

  // ── Drag & drop del paso 4 (arrastrar el contrato completo sobre la tarjeta) ──
  /** Se está arrastrando un archivo sobre la tarjeta del paso 4. */
  step4Dragging = false;
  /** Contador de dragenter/dragleave para evitar parpadeo del overlay (ver paso 3). */
  private step4DragCount = 0;

  private canDropStep4(): boolean {
    return this.actualStatus === 4 && this.canSendToSc;
  }

  onStep4DragEnter(event: DragEvent): void {
    if (!this.canDropStep4()) return;
    event.preventDefault();
    this.step4DragCount++;
    this.step4Dragging = true;
  }

  onStep4DragOver(event: DragEvent): void {
    if (!this.canDropStep4()) return;
    event.preventDefault();
  }

  onStep4DragLeave(event: DragEvent): void {
    event.preventDefault();
    this.step4DragCount = Math.max(this.step4DragCount - 1, 0);
    if (this.step4DragCount === 0) this.step4Dragging = false;
  }

  onStep4Drop(event: DragEvent): void {
    if (!this.canDropStep4()) return;
    event.preventDefault();
    this.step4DragCount = 0;
    this.step4Dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.step4File = file;
  }

  private async sendScNotification(): Promise<void> {
    // Solo Oficina Técnica puede enviar al SC (paso 4 → 5).
    if (!this.hasOfTecnica) {
      Swal.fire({ icon: 'warning', title: 'Acción no permitida', text: 'Solo Oficina Técnica puede enviar al SC.', draggable: true });
      return;
    }
    if (!this.step4File && !this.item.package) return;
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    // Si el archivo está en memoria lo enviamos adjunto; si el paquete ya está guardado en
    // SharePoint (reapertura del modal) lo omitimos y el backend lo descarga por URL.
    this.adjudicacionesService.sendScNotification(
      this.item.projectSubContractorId,
      graphToken,
      this.step4File ?? undefined,
    ).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 5;
        this.viewStep = 5;
        this.step4File = null;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Correo enviado al subcontratista', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private async sendNotification(): Promise<void> {
    // Traer los destinatarios reales (Para + CC, sin copia oculta) para mostrarlos en la confirmación.
    this.loaderService.show();
    let to: string[] = [];
    let cc: string[] = [];
    try {
      const recipients = await firstValueFrom(
        this.adjudicacionesService.getNotificationRecipients(this.item.projectSubContractorId),
      );
      to = recipients.to ?? [];
      cc = recipients.cc ?? [];
    } catch (err) {
      this.loaderService.hide();
      this.errorService.handleError(err as HttpErrorResponse);
      return;
    }
    this.loaderService.hide();

    const listHtml = (emails: string[]) =>
      emails.length
        ? `<ul style="text-align:left; margin:4px 0 0; padding-left:18px; list-style:disc; color:#374151;">
            ${emails.map(e => `<li style="margin:2px 0; word-break:break-all;">${e}</li>`).join('')}
          </ul>`
        : `<p style="color:#9ca3af; font-style:italic; margin:4px 0 0;">Sin correos registrados.</p>`;

    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Enviar correos?',
      html: `
        <div style="text-align:left;">
          <p style="color:#111827; font-weight:600; margin:0 0 2px;">Para:</p>
          ${listHtml(to)}
          <p style="color:#111827; font-weight:600; margin:12px 0 2px;">En copia (CC):</p>
          ${listHtml(cc)}
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64BC04',
      draggable: true,
    });
    if (!confirm.isConfirmed) return;

    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft. Por favor inicie sesión nuevamente.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService.sendNotification({
      projectSubContractorId: this.item.projectSubContractorId,
      graphAccessToken: graphToken,
    }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 2;
        this.viewStep = 2;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Notificación enviada exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Paso 6 — solo Oficina Central (o Administrador) puede marcar las firmas. */
  get canMarkStep6(): boolean {
    return this.hasOfCentral;
  }

  /** Paso 6 — persiste en BD el estado de los checkboxes al marcarlos/desmarcarlos. */
  onStep6CheckChange(): void {
    if (!this.canMarkStep6 || this.actualStatus !== 6) return;
    this.adjudicacionesService.updateStep6Checks(this.item.projectSubContractorId, {
      signedCostos:              this.step6ConfirmedCostos,
      signedGerenteInmobiliario: this.step6ConfirmedOriundo,
      signedGerenteGeneral:      this.step6ConfirmedToratto,
    }).subscribe({
      next: () => {
        this.item.step6SignedCostos              = this.step6ConfirmedCostos;
        this.item.step6SignedGerenteInmobiliario = this.step6ConfirmedOriundo;
        this.item.step6SignedGerenteGeneral      = this.step6ConfirmedToratto;
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  /** Paso 5 — Of. Central envía las observaciones de la llegada a Oficina Técnica. */
  async sendStep5ObservationsEmail(): Promise<void> {
    const observation = this.step5ArrivalObservation.trim();
    if (!observation) {
      Swal.fire({
        icon: 'warning',
        title: 'Observación requerida',
        text: 'Escriba la observación antes de enviar el correo a Oficina Técnica.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    this.sendingStep5Observations = true;
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      this.sendingStep5Observations = false;
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService
      .sendStep5ObservationsEmail(this.item.projectSubContractorId, { graphAccessToken: graphToken, observation })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          this.sendingStep5Observations = false;
          this.item.arrivalObservation = observation;
          Swal.fire({ icon: 'success', title: res.message ?? 'Correo enviado exitosamente', draggable: true });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.sendingStep5Observations = false;
          this.errorService.handleError(err);
        },
      });
  }

  /** Paso 5 — Of. Técnica notifica a Oficina Central que las observaciones fueron levantadas. */
  async sendStep5LevantamientoEmail(): Promise<void> {
    this.sendingStep5Levantamiento = true;
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      this.sendingStep5Levantamiento = false;
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService
      .sendStep5LevantamientoEmail(this.item.projectSubContractorId, {
        graphAccessToken: graphToken,
        message: this.step5LevantamientoMessage.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.loaderService.hide();
          this.sendingStep5Levantamiento = false;
          this.step5LevantamientoMessage = '';
          Swal.fire({ icon: 'success', title: res.message ?? 'Correo enviado exitosamente', draggable: true });
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.sendingStep5Levantamiento = false;
          this.errorService.handleError(err);
        },
      });
  }

  private sendStep6Notification(): void {
    this.loaderService.show();
    this.adjudicacionesService.sendStep6Notification(this.item.projectSubContractorId).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 7;
        this.viewStep = 7;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Paso 6 confirmado', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onArrivalOptionChange(option: 'complete' | 'with_observations'): void {
    // Solo Oficina Central puede marcar la llegada.
    if (!this.hasOfCentral) return;
    this.step5ArrivalOption = option;
    this.step5ObservationsResolved = false;
    this.adjudicacionesService.setArrivalOption(this.item.projectSubContractorId, option === 'with_observations').subscribe({
      next: () => {
        this.item.arrivedWithObservations = option === 'with_observations';
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  private async confirmStep5(): Promise<void> {
    // Solo Oficina Central puede confirmar la recepción (paso 5 → 6).
    if (!this.hasOfCentral) {
      Swal.fire({ icon: 'warning', title: 'Acción no permitida', text: 'Solo Oficina Central puede confirmar la recepción.', draggable: true });
      return;
    }
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    const arrivedWithObservations = this.step5ArrivalOption === 'with_observations';
    const arrivalObservation = this.step5ArrivalObservation.trim() || null;
    this.adjudicacionesService.confirmStep5(this.item.projectSubContractorId, arrivedWithObservations, arrivalObservation, graphToken).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 6;
        this.item.arrivedWithObservations = arrivedWithObservations;
        this.item.arrivalObservation = arrivalObservation;
        this.viewStep = 6;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Recepción confirmada exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private async advanceToApproved(): Promise<void> {
    // Validación: el contrato debe estar Aprobado (con archivo) para poder avanzar.
    if (!this.contractApproved) {
      Swal.fire({
        icon: 'warning',
        title: 'Contrato no aprobado',
        text: 'El contrato debe estar en estado "Aprobado" (con su archivo subido) para poder avanzar al siguiente paso.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    this.loaderService.show();

    // El correo de notificación al Staff de Obra se envía vía Graph como el usuario autenticado.
    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService.advanceToStep4(this.item.projectSubContractorId, graphToken).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 4;
        this.viewStep = 4;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Adjudicación aprobada exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  triggerUploadScanned(docKey: string): void {
    // Solo Oficina Central (o Administrador) puede subir el documento escaneado.
    if (!this.hasOfCentral) return;
    this.currentScannedDocType = docKey;
    this.fileInputStep7.nativeElement.value = '';
    this.fileInputStep7.nativeElement.click();
  }

  onFileSelectedScanned(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.currentScannedDocType) return;
    this.uploadDoc(this.currentScannedDocType, input.files[0]);
  }

  // ── Drag & drop del paso 7 (arrastrar el escaneado sobre cada slot) ──
  // Reutiliza dragDoc/dragEnterCount (mismas del paso 3; ambos pasos nunca se ven a la vez).
  private canDropScanned(): boolean {
    return this.hasOfCentral && this.uploadingDoc === null;
  }

  onScannedDragEnter(docKey: string, event: DragEvent): void {
    if (!this.canDropScanned()) return;
    event.preventDefault();
    this.dragEnterCount[docKey] = (this.dragEnterCount[docKey] ?? 0) + 1;
    this.dragDoc = docKey;
  }

  onScannedDragOver(docKey: string, event: DragEvent): void {
    if (!this.canDropScanned()) return;
    event.preventDefault();
  }

  onScannedDragLeave(docKey: string, event: DragEvent): void {
    event.preventDefault();
    const remaining = (this.dragEnterCount[docKey] ?? 1) - 1;
    this.dragEnterCount[docKey] = Math.max(remaining, 0);
    if (this.dragEnterCount[docKey] === 0 && this.dragDoc === docKey) this.dragDoc = null;
  }

  onScannedDrop(docKey: string, event: DragEvent): void {
    if (!this.canDropScanned()) return;
    event.preventDefault();
    this.dragEnterCount[docKey] = 0;
    this.dragDoc = null;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.currentScannedDocType = docKey;
      this.uploadDoc(docKey, file);
    }
  }

  private async sendStep8Notification(): Promise<void> {
    this.loaderService.show();

    let graphToken: string;
    try {
      graphToken = await this.microsoftAuthService.getGraphToken();
    } catch (err: any) {
      this.loaderService.hide();
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: err?.message ?? 'No se pudo obtener el token de Microsoft.',
        draggable: true,
      });
      return;
    }

    this.adjudicacionesService.sendStep8Notification(
      this.item.projectSubContractorId,
      graphToken,
    ).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 9;
        this.viewStep = 9;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Correo enviado a Staff de Obra', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private advanceFromStep7(): void {
    this.loaderService.show();
    this.adjudicacionesService.updateStatus(this.item.projectSubContractorId, 8).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.item.projectSubContractorStatusId = 8;
        this.viewStep = 8;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Documentos escaneados confirmados', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private saveStep2Dates(): void {
    // Coerce: el input[type=number] puede entregar string vacío; convertir a null o número entero
    const rawNum = this.step2Form.contractNumber;
    const contractNumber: number | null =
      rawNum === null || rawNum === undefined || (rawNum as any) === ''
        ? null
        : Math.trunc(Number(rawNum));

    const rawPn = this.step2Form.promissoryNoteNumber;
    const promissoryNoteNumber: number | null =
      rawPn === null || rawPn === undefined || (rawPn as any) === ''
        ? null
        : Math.trunc(Number(rawPn));

    // Validar obligatorio
    if (contractNumber === null) {
      Swal.fire({ icon: 'warning', title: 'El número de contrato es obligatorio.', draggable: true });
      return;
    }

    // Validar rango int32
    if (contractNumber < 0 || contractNumber > 2_147_483_647) {
      Swal.fire({
        icon: 'warning',
        title: 'Número de contrato inválido',
        text: 'El número de contrato debe ser un entero positivo menor a 2,147,483,647.',
        draggable: true,
      });
      return;
    }

    if (this.requiresPromissoryNote && promissoryNoteNumber === null) {
      Swal.fire({ icon: 'warning', title: 'El número de pagaré es obligatorio.', draggable: true });
      return;
    }

    if (promissoryNoteNumber !== null && (promissoryNoteNumber < 0 || promissoryNoteNumber > 2_147_483_647)) {
      Swal.fire({
        icon: 'warning',
        title: 'Número de pagaré inválido',
        text: 'El número de pagaré debe ser un entero positivo menor a 2,147,483,647.',
        draggable: true,
      });
      return;
    }

    const rawGfp = this.step2Form.guaranteeFundPercentage;
    const guaranteeFundPercentage: number | null =
      rawGfp === null || rawGfp === undefined || (rawGfp as any) === ''
        ? null
        : Math.trunc(Number(rawGfp));

    const rawGfd = this.step2Form.guaranteeFundDays;
    const guaranteeFundDays: number | null =
      rawGfd === null || rawGfd === undefined || (rawGfd as any) === ''
        ? null
        : Math.trunc(Number(rawGfd));

    const rawGvd = this.step2Form.guaranteeValidityDays;
    const guaranteeValidityDays: number | null =
      rawGvd === null || rawGvd === undefined || (rawGvd as any) === ''
        ? null
        : Math.trunc(Number(rawGvd));

    if (guaranteeFundPercentage === null) {
      Swal.fire({ icon: 'warning', title: 'El porcentaje del fondo de garantía es obligatorio.', draggable: true });
      return;
    }

    if (guaranteeFundDays === null) {
      Swal.fire({ icon: 'warning', title: 'Los días del fondo de garantía son obligatorios.', draggable: true });
      return;
    }

    // Forma de pago (días hábiles): si queda vacío se usa el default 7
    const rawPd = this.step2Form.paymentDays;
    const paymentDays: number =
      rawPd === null || rawPd === undefined || (rawPd as any) === ''
        ? 7
        : Math.trunc(Number(rawPd));

    if (this.step2Form.startDate && this.step2Form.endDate &&
        new Date(this.step2Form.startDate) > new Date(this.step2Form.endDate)) {
      Swal.fire({ icon: 'warning', title: 'La fecha de inicio no puede ser posterior a la fecha fin del contrato.', draggable: true });
      return;
    }

    this.loaderService.show();
    this.adjudicacionesService.saveDates(this.item.projectSubContractorId, {
      signingDate:    this.step2Form.signingDate,
      startDate:      this.step2Form.startDate,
      endDate:        this.step2Form.endDate,
      contractNumber,
      promissoryNoteNumber,
      guaranteeFundPercentage,
      guaranteeFundDays,
      guaranteeValidityDays,
      paymentDays,
    }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        // Solo avanza a paso 3 cuando viene desde el paso 2 (progresión). En edición (pasos 3/4) conserva estado.
        const wasStep2 = this.item.projectSubContractorStatusId === 2;
        this.item.signingDate              = this.step2Form.signingDate;
        this.item.startDate                = this.step2Form.startDate;
        this.item.endDate                  = this.step2Form.endDate;
        this.item.contractNumber           = contractNumber;
        this.item.promissoryNoteNumber     = promissoryNoteNumber;
        this.item.guaranteeFundPercentage  = guaranteeFundPercentage;
        this.item.guaranteeFundDays        = guaranteeFundDays;
        this.item.guaranteeValidityDays    = guaranteeValidityDays;
        this.item.paymentDays              = paymentDays;
        if (wasStep2) {
          this.item.projectSubContractorStatusId = 3;
          this.viewStep = 3;
        }
        this.step2EditMode = false;
        this.statusChanged.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Datos guardados exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Edición del paso 2 en pasos 3/4 (guardar sin avanzar) ──────────────
  enterStep2Edit(): void {
    this.step2EditMode = true;
  }

  cancelStep2Edit(): void {
    this.step2EditMode = false;
    // Restaurar el formulario desde el item guardado
    this.step2Form.signingDate            = this.item.signingDate ? this.item.signingDate.substring(0, 10) : '';
    this.step2Form.startDate              = this.item.startDate ? this.item.startDate.substring(0, 10) : '';
    this.step2Form.endDate                = this.item.endDate ? this.item.endDate.substring(0, 10) : '';
    this.step2Form.contractNumber         = this.item.contractNumber ?? null;
    this.step2Form.promissoryNoteNumber   = this.item.promissoryNoteNumber ?? null;
    this.step2Form.guaranteeFundPercentage = this.item.guaranteeFundPercentage ?? null;
    this.step2Form.guaranteeFundDays      = this.item.guaranteeFundDays ?? null;
    this.step2Form.guaranteeValidityDays  = this.item.guaranteeValidityDays ?? null;
    this.step2Form.paymentDays            = this.item.paymentDays ?? 7;
  }

  /** Guardar cambios del paso 2 en modo edición (reutiliza la validación/guardado de saveStep2Dates). */
  saveStep2Edit(): void {
    this.saveStep2Dates();
  }

  // ── Edición del paso 1 (información de la adjudicación) ─────────────────
  private ensureFormData(after: () => void): void {
    if (this.formData) { after(); return; }
    this.loaderService.show();
    this.adjudicacionesService.getFormData().subscribe({
      next: (res) => {
        this.formData = res;
        this.loaderService.hide();
        after();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  enterStep1Edit(): void {
    this.ensureFormData(() => {
      this.step1Form = {
        projectId:          this.item.projectId,
        contractorId:       this.item.contractorId,
        contractTypeId:     this.item.contractTypeId,
        contractModalityId: this.item.contractModalityId ?? null,
        paymentMethodId:    this.item.paymentMethodId,
        paymentFormId:      this.item.paymentFormId ?? null,
        includesCartaFianza: this.item.includesCartaFianza ?? false,
        advancePercentage:  this.item.advancePercentage ?? null,
        amount:             this.item.amount,
        currencyId:         this.item.currencyId,
        // El monto siempre incluye IGV (ya no es configurable).
        hasIgv:             true,
        workItemId:         this.item.workItemId,
        workItemCategoryId: this.item.workItemCategoryId,
        workSpecialtyId:    this.item.workSpecialtyId ?? null,
        isSubcontract:      this.item.isSubcontract ?? false,
        isLabor:            this.item.isLabor ?? false,
        contractWorkItemName: this.item.contractWorkItemName ?? '',
      };
      // El nombre guardado se considera "editado a mano" para no pisarlo al abrir la edición.
      this.step1NameManuallyEdited = !!this.item.contractWorkItemName?.trim();
      // Correos del contratista seleccionado
      const contractor = this.formData!.contributors.find(c => c.contractorId === this.item.contractorId);
      this.step1ContractorEmails = contractor?.emails ?? this.item.contractorEmails ?? [];
      // Monto de adelanto inicial
      this.step1AdvanceAmount = (this.step1Form.advancePercentage != null && this.step1Form.amount)
        ? Math.round((this.step1Form.advancePercentage / 100) * this.step1Form.amount * 1_000_000) / 1_000_000
        : undefined;
      this.resetStep1Files();
      this.step1EditMode = true;
    });
  }

  cancelStep1Edit(): void {
    this.step1EditMode = false;
    this.resetStep1Files();
  }

  // ── Archivos del paso 1 en modo edición ─────────────────────────────────
  /** Vuelve al estado guardado: descarta los archivos nuevos y las eliminaciones pendientes. */
  private resetStep1Files(): void {
    this.step1ExistingQuotationFiles   = [...(this.item.quotationFiles ?? [])];
    this.step1ExistingComparativeFiles = [...(this.item.comparativeFiles ?? [])];
    this.step1RemovedQuotationFileIds   = [];
    this.step1RemovedComparativeFileIds = [];
    this.step1NewQuotationFiles     = [];
    this.step1NewComparativeFiles   = [];
    this.step1NewQuotationItems     = [];
    this.step1NewComparativeItems   = [];
  }

  /** Cotizaciones que quedarían guardadas: las que sobreviven + las nuevas. */
  get step1QuotationCount(): number {
    return this.step1ExistingQuotationFiles.length + this.step1NewQuotationFiles.length;
  }

  get step1ComparativeCount(): number {
    return this.step1ExistingComparativeFiles.length + this.step1NewComparativeFiles.length;
  }

  onStep1QuotationSelected(file: SelectedFile): void {
    this.step1NewQuotationItems.push({ name: file.file.name, size: this.formatFileSize(file.file.size) });
    this.step1NewQuotationFiles.push(file.file);
  }

  onStep1ComparativeSelected(file: SelectedFile): void {
    this.step1NewComparativeItems.push({ name: file.file.name, size: this.formatFileSize(file.file.size) });
    this.step1NewComparativeFiles.push(file.file);
  }

  removeStep1NewQuotationFile(index: number): void {
    this.step1NewQuotationItems.splice(index, 1);
    this.step1NewQuotationFiles.splice(index, 1);
  }

  removeStep1NewComparativeFile(index: number): void {
    this.step1NewComparativeItems.splice(index, 1);
    this.step1NewComparativeFiles.splice(index, 1);
  }

  /** Quita un archivo ya guardado: sale de la lista y su id se manda para el soft delete. */
  removeStep1ExistingQuotationFile(index: number): void {
    const [removed] = this.step1ExistingQuotationFiles.splice(index, 1);
    if (removed?.fileId != null) this.step1RemovedQuotationFileIds.push(removed.fileId);
  }

  removeStep1ExistingComparativeFile(index: number): void {
    const [removed] = this.step1ExistingComparativeFiles.splice(index, 1);
    if (removed?.fileId != null) this.step1RemovedComparativeFileIds.push(removed.fileId);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  get step1SelectedCurrencyCode(): string {
    return this.formData?.currencies.find(c => c.currencyId === this.step1Form.currencyId)?.currencyCode ?? '';
  }

  /** Nombre del instructivo asociado a la partida de control seleccionada (edición paso 1). */
  get step1SelectedWorkItemCategoryInstructivoName(): string | null {
    if (!this.step1Form.workItemCategoryId) return null;
    return this.formData?.workItemCategories
      .find(c => c.workItemCategoryId === this.step1Form.workItemCategoryId)
      ?.instructivosFolderName ?? null;
  }

  /** True solo cuando hay una partida seleccionada en la edición del paso 1. */
  get step1IsWorkItemSelected(): boolean {
    return !!this.step1Form.workItemId;
  }

  /** Formas de valorización (cláusula 5.1) de la partida seleccionada (edición paso 1). */
  get step1SelectedWorkItemForms() {
    if (!this.step1Form.workItemId) return [];
    return this.formData?.workItems
      .find(w => w.workItemId === this.step1Form.workItemId)
      ?.valorizationForms ?? [];
  }

  onStep1CompanyChange(contractorId: number): void {
    this.step1Form.contractorId = contractorId;
    const contractor = this.formData?.contributors.find(c => c.contractorId === contractorId);
    this.step1ContractorEmails = contractor?.emails ?? [];
  }

  /** Recompone el nombre final de la partida salvo que el usuario lo haya editado a mano. */
  recomputeStep1ContractName(): void {
    if (this.step1NameManuallyEdited) return;
    this.step1Form.contractWorkItemName = buildContractPartidaName({
      workItemDescription: this.formData?.workItems
        .find(w => w.workItemId === this.step1Form.workItemId)?.workItemDescription,
      contractModalityDescription: this.formData?.contractModalities
        .find(m => m.contractModalityId === this.step1Form.contractModalityId)?.contractModalityDescription,
      isSubcontract: this.step1Form.isSubcontract,
      isLabor: this.step1Form.isLabor,
    });
  }

  onStep1WorkItemChange(workItemId: number): void {
    this.step1Form.workItemId = workItemId;
    this.recomputeStep1ContractName();
  }

  onStep1ContractModalityChange(contractModalityId: number | null): void {
    this.step1Form.contractModalityId = contractModalityId;
    this.recomputeStep1ContractName();
  }

  toggleStep1Subcontract(): void {
    this.step1Form.isSubcontract = !this.step1Form.isSubcontract;
    this.recomputeStep1ContractName();
  }

  toggleStep1Labor(): void {
    this.step1Form.isLabor = !this.step1Form.isLabor;
    this.recomputeStep1ContractName();
  }

  onStep1ContractNameInput(value: string): void {
    this.step1Form.contractWorkItemName = value;
    this.step1NameManuallyEdited = true;
  }

  regenerateStep1ContractName(): void {
    this.step1NameManuallyEdited = false;
    this.recomputeStep1ContractName();
  }

  onStep1AmountChange(): void {
    if (this.step1Form.advancePercentage != null && this.step1Form.amount) {
      this.step1AdvanceAmount = Math.round((this.step1Form.advancePercentage / 100) * this.step1Form.amount * 1_000_000) / 1_000_000;
    } else {
      this.step1AdvanceAmount = undefined;
    }
  }

  onStep1PercentageInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const match = input.value.match(/^\d*\.?\d{0,6}/);
    let clamped = match ? match[0] : '';
    const numeric = parseFloat(clamped);
    if (!isNaN(numeric) && numeric > 100) clamped = '100';
    if (input.value !== clamped) input.value = clamped;
    this.step1Form.advancePercentage = clamped !== '' ? parseFloat(clamped) : null;
    if (this.step1Form.advancePercentage != null && this.step1Form.amount) {
      this.step1AdvanceAmount = Math.round((this.step1Form.advancePercentage / 100) * this.step1Form.amount * 1_000_000) / 1_000_000;
    } else {
      this.step1AdvanceAmount = undefined;
    }
  }

  onStep1AdvanceAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const match = input.value.match(/^\d*\.?\d{0,6}/);
    let clamped = match ? match[0] : '';
    const numeric = parseFloat(clamped);
    // No permitir que el adelanto supere el monto total
    if (!isNaN(numeric) && this.step1Form.amount && numeric > this.step1Form.amount) {
      clamped = this.step1Form.amount.toString();
    }
    if (input.value !== clamped) input.value = clamped;
    this.step1AdvanceAmount = clamped !== '' ? parseFloat(clamped) : undefined;
    if (this.step1AdvanceAmount != null && this.step1Form.amount) {
      // Math.floor con epsilon para evitar que 499.9999/500 redondee a 100%
      const raw = (this.step1AdvanceAmount / this.step1Form.amount) * 100;
      this.step1Form.advancePercentage = Math.floor(raw * 1_000_000 + 1e-9) / 1_000_000;
    } else {
      this.step1Form.advancePercentage = null;
    }
  }

  saveStep1(): void {
    const f = this.step1Form;
    const missing: string[] = [];
    if (!f.projectId)          missing.push('Proyecto');
    if (!f.contractorId)       missing.push('Empresa / Subcontratista');
    else if (this.step1ContractorEmails.length === 0)
      missing.push('La empresa seleccionada no tiene correos registrados');
    if (!f.workSpecialtyId)    missing.push('Especialidad');
    if (!f.workItemCategoryId) missing.push('Partida de control');
    if (!f.workItemId)         missing.push('Partida');
    if (!f.contractWorkItemName?.trim()) missing.push('Nombre de la partida en el contrato');
    if (!f.contractModalityId) missing.push('Modalidad de contrato');
    if (!f.contractTypeId)     missing.push('Tipo de contrato');
    if (!f.amount)             missing.push('Monto');
    if (!f.currencyId)         missing.push('Moneda');
    if (!f.paymentMethodId)    missing.push('Modalidad de pago');
    if (!f.paymentFormId)      missing.push('Forma de pago');
    if (f.paymentMethodId === 2 && !f.advancePercentage) missing.push('Porcentaje de adelanto');
    // La cotización es opcional aquí (solo se exige al notificar), pero los topes sí se respetan.
    if (this.step1QuotationCount > this.maxQuotationFiles)
      missing.push(`Máximo ${this.maxQuotationFiles} archivos de cotización`);
    if (this.step1ComparativeCount > this.maxComparativeFiles)
      missing.push(`Máximo ${this.maxComparativeFiles} archivo comparativo`);

    if (missing.length > 0) {
      Swal.fire({
        title: 'Campos requeridos',
        html: `<ul class="text-left text-sm list-disc pl-4">${missing.map(m => `<li>${m}</li>`).join('')}</ul>`,
        icon: 'warning',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    const isAdvance = f.paymentMethodId === 2;
    // El % / monto del pagaré se captura en contrato con adelanto (2, obligatorio) y pago a cuenta (4, opcional).
    const usesPagareAmount = f.paymentMethodId === 2 || f.paymentMethodId === 4;
    // Carta de fianza solo aplica en Suministro (modalidad 2) + contrato con adelanto (pago 2)
    const includesCartaFianza = f.contractModalityId === 2 && f.paymentMethodId === 2 && !!f.includesCartaFianza;
    const form = new FormData();
    form.append('projectId', f.projectId.toString());
    form.append('contractorId', f.contractorId.toString());
    form.append('contractTypeId', f.contractTypeId.toString());
    if (f.contractModalityId != null) form.append('contractModalityId', f.contractModalityId.toString());
    form.append('paymentMethodId', f.paymentMethodId.toString());
    if (f.paymentFormId != null) form.append('paymentFormId', f.paymentFormId.toString());
    form.append('includesCartaFianza', includesCartaFianza.toString());
    form.append('advancePercentage', (usesPagareAmount ? (f.advancePercentage ?? 0) : 0).toString());
    if (usesPagareAmount && this.step1AdvanceAmount != null) {
      form.append('advanceAmount', this.step1AdvanceAmount.toString());
    }
    form.append('amount', f.amount.toString());
    form.append('currencyId', f.currencyId.toString());
    form.append('hasIgv', f.hasIgv.toString());
    form.append('workItemId', f.workItemId.toString());
    form.append('workItemCategoryId', f.workItemCategoryId.toString());
    if (f.workSpecialtyId != null) form.append('workSpecialtyId', f.workSpecialtyId.toString());
    form.append('isSubcontract', f.isSubcontract.toString());
    form.append('isLabor', f.isLabor.toString());
    form.append('contractWorkItemName', (f.contractWorkItemName ?? '').trim());
    // Archivos del paso 1: los nuevos se suben y los quitados se dan de baja en el mismo guardado.
    this.step1NewQuotationFiles.forEach(file => form.append('newQuotationFiles', file));
    this.step1NewComparativeFiles.forEach(file => form.append('newComparativeFiles', file));
    this.step1RemovedQuotationFileIds.forEach(id => form.append('removedQuotationFileIds', id.toString()));
    this.step1RemovedComparativeFileIds.forEach(id => form.append('removedComparativeFileIds', id.toString()));

    this.loaderService.show();
    this.adjudicacionesService.updateInfo(this.item.projectSubContractorId, form).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.step1EditMode = false;

        // Reflejar localmente los cambios que afectan al modal abierto: el pagaré aparece/desaparece
        // según la modalidad de pago, así que hay que reconstruir la lista de documentos sin esperar
        // a que el padre recargue (que no refresca el item ya abierto).
        this.item.paymentMethodId    = f.paymentMethodId;
        this.item.contractModalityId = f.contractModalityId;
        this.item.includesCartaFianza = includesCartaFianza;
        this.item.advancePercentage  = usesPagareAmount ? (f.advancePercentage ?? 0) : 0;
        this.item.advanceAmount      = usesPagareAmount ? (this.step1AdvanceAmount ?? null) : null;
        this.documents = this.buildDocuments();
        this.initDocForms();
        // Los archivos los vuelve a traer el padre al refrescar el item; acá solo se limpia el
        // borrador para que una siguiente edición no arrastre subidas ni bajas ya aplicadas.
        this.resetStep1Files();

        this.statusChanged.emit(); // el padre recarga y refresca el item con los datos nuevos
        Swal.fire({ icon: 'success', title: res.message ?? 'Información actualizada exitosamente', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
