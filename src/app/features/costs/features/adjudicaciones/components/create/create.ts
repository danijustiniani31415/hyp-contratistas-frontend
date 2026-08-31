import { Component, EventEmitter, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { ProjectSubContractorCreateDTO } from '../../dtos/projectSubContractorCreateDto.model';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { AdjudicacionesService } from '../../services/adjudicaciones.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ProjectSubContractorFormDataDTO } from '../../dtos/projectSubContractorFormDataDTO.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { FilePreview, FilePreviewItem } from '../../../../../../shared/components/file-preview/file-preview';
import { buildContractPartidaName } from '../../utils/contract-partida-name';
import Swal from 'sweetalert2';

@Component({
  standalone: true,
  selector: 'app-create',
  imports: [BaseModal, CommonModule, FormsModule, FileSelector, FilePreview, SearchSelect],
  templateUrl: './create.html',
  styleUrl: './create.css',
})
export class Create implements OnInit {
  createFormData: ProjectSubContractorFormDataDTO = {
    projects: [],
    contractTypes: [],
    contractModalities: [],
    paymentMethods: [],
    paymentForms: [],
    currencies: [],
    workItems: [],
    contributors: [],
    workItemCategories: [],
    workSpecialties: [],
    projectSubContractorStatuses: []
  }

  createDto: ProjectSubContractorCreateDTO = {
    projectId: 0,
    contractorId: 0,
    contractTypeId: 0,
    contractModalityId: null,
    paymentMethodId: 0,
    paymentFormId: null,
    includesCartaFianza: false,
    amount: 0,
    currencyId: 0,
    // El monto de una adjudicación siempre incluye IGV (ya no es configurable).
    hasIgv: true,
    workItemId: 0,
    workItemCategoryId: 0,
    workSpecialtyId: null,
    isSubcontract: false,
    isLabor: false,
    contractWorkItemName: '',
    quotationFiles: [],
    comparativeFiles: [],
  };

  /** Se activa cuando el usuario edita manualmente el nombre final; corta la regeneración automática. */
  nameManuallyEdited = false;

  /** Opciones No/Sí para el search-select de carta de fianza. */
  readonly cartaFianzaOptions = [
    { value: false, label: 'No' },
    { value: true, label: 'Sí' },
  ];

  contractorEmails: string[] = [];
  advanceAmount: number | undefined = undefined;
  submitted = false;

  /** Modo "Buscar por partida": reemplaza el desplegable de Especialidad por uno de partidas. */
  searchByWorkItem = false;

  quotationFileItems: FilePreviewItem[] = [];
  comparativeFileItems: FilePreviewItem[] = [];
  readonly maxQuotationFiles = 3;
  readonly maxComparativeFiles = 1;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  constructor(
    private adjudicacionesService: AdjudicacionesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.getFormData();
    });
  }

  onQuotationImageSelected(file: SelectedFile) {
    this.quotationFileItems.push({ name: file.file.name, size: this.formatFileSize(file.file.size) });
    this.createDto.quotationFiles!.push(file.file);
  }

  onComparativeImageSelected(file: SelectedFile) {
    this.comparativeFileItems.push({ name: file.file.name, size: this.formatFileSize(file.file.size) });
    this.createDto.comparativeFiles!.push(file.file);
  }

  removeQuotationFile(index: number) {
    this.quotationFileItems.splice(index, 1);
    this.createDto.quotationFiles!.splice(index, 1);
  }

  removeComparativeFile(index: number) {
    this.comparativeFileItems.splice(index, 1);
    this.createDto.comparativeFiles!.splice(index, 1);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  get selectedCurrencyCode(): string {
    return this.createFormData.currencies.find(c => c.currencyId === this.createDto.currencyId)?.currencyCode ?? '';
  }

  get selectedWorkItemCategorySyncStatus(): number | null {
    if (!this.createDto.workItemCategoryId) return null;
    return this.createFormData.workItemCategories
      .find(c => c.workItemCategoryId === this.createDto.workItemCategoryId)
      ?.instructivosSyncStatus ?? null;
  }

  /** Nombre del instructivo asociado a la partida de control seleccionada. */
  get selectedWorkItemCategoryInstructivoName(): string | null {
    if (!this.createDto.workItemCategoryId) return null;
    return this.createFormData.workItemCategories
      .find(c => c.workItemCategoryId === this.createDto.workItemCategoryId)
      ?.instructivosFolderName ?? null;
  }

  /** Partidas de control que pertenecen a la especialidad seleccionada (filtrado en cascada). */
  get filteredWorkItemCategories() {
    if (!this.createDto.workSpecialtyId) return [];
    return this.createFormData.workItemCategories
      .filter(c => c.workSpecialtyId === this.createDto.workSpecialtyId);
  }

  /** Partidas que pertenecen a la partida de control seleccionada (filtrado en cascada). */
  get filteredWorkItems() {
    if (!this.createDto.workItemCategoryId) return [];
    return this.createFormData.workItems
      .filter(w => w.workItemCategoryId === this.createDto.workItemCategoryId);
  }

  /** True solo cuando hay una partida seleccionada (para mostrar el indicador de formas de valorización). */
  get isWorkItemSelected(): boolean {
    return !!this.createDto.workItemId;
  }

  /** Formas de valorización (cláusula 5.1) de la partida seleccionada, ordenadas. */
  get selectedWorkItemForms() {
    if (!this.createDto.workItemId) return [];
    return this.createFormData.workItems
      .find(w => w.workItemId === this.createDto.workItemId)
      ?.valorizationForms ?? [];
  }

  /**
   * Partidas buscables en modo "Buscar por partida": solo las que tienen partida de control
   * con especialidad, porque son las únicas alcanzables por el flujo en cascada normal
   * (y la creación exige partida de control).
   */
  get searchableWorkItems() {
    return this.createFormData.workItems.filter(w => {
      if (!w.workItemCategoryId) return false;
      const category = this.createFormData.workItemCategories
        .find(c => c.workItemCategoryId === w.workItemCategoryId);
      return !!category?.workSpecialtyId;
    });
  }

  /** Al activar el modo búsqueda se limpia la cascada para empezar de cero. */
  toggleSearchByWorkItem(): void {
    this.searchByWorkItem = !this.searchByWorkItem;
    if (this.searchByWorkItem) {
      this.createDto.workSpecialtyId = null;
      this.createDto.workItemCategoryId = 0;
      this.createDto.workItemId = 0;
      this.recomputeContractName();
    }
  }

  /**
   * Al elegir una partida en modo búsqueda se resuelve la cascada hacia atrás
   * (partida → partida de control → especialidad) y se vuelve a la vista normal
   * con los tres desplegables ya escogidos.
   */
  onSearchWorkItemSelected(workItemId: number): void {
    const item = this.createFormData.workItems.find(w => w.workItemId === workItemId);
    if (!item?.workItemCategoryId) return;
    const category = this.createFormData.workItemCategories
      .find(c => c.workItemCategoryId === item.workItemCategoryId);
    this.createDto.workSpecialtyId = category?.workSpecialtyId ?? null;
    this.createDto.workItemCategoryId = item.workItemCategoryId;
    this.createDto.workItemId = workItemId;
    this.recomputeContractName();
    this.searchByWorkItem = false;
  }

  onCompanyChange(contractorId: number): void {
    this.createDto.contractorId = contractorId;
    const contractor = this.createFormData.contributors.find(c => c.contractorId === contractorId);
    this.contractorEmails = contractor?.emails ?? [];
  }

  /** Recompone el nombre final de la partida salvo que el usuario lo haya editado a mano. */
  recomputeContractName(): void {
    if (this.nameManuallyEdited) return;
    this.createDto.contractWorkItemName = buildContractPartidaName({
      workItemDescription: this.createFormData.workItems
        .find(w => w.workItemId === this.createDto.workItemId)?.workItemDescription,
      contractModalityDescription: this.createFormData.contractModalities
        .find(m => m.contractModalityId === this.createDto.contractModalityId)?.contractModalityDescription,
      isSubcontract: this.createDto.isSubcontract,
      isLabor: this.createDto.isLabor,
    });
  }

  onWorkItemChange(workItemId: number): void {
    this.createDto.workItemId = workItemId;
    this.recomputeContractName();
  }

  /** Al cambiar la especialidad se reinicia la partida de control y la partida (cascada). */
  onWorkSpecialtyChange(workSpecialtyId: number | null): void {
    this.createDto.workSpecialtyId = workSpecialtyId;
    this.createDto.workItemCategoryId = 0;
    this.createDto.workItemId = 0;
    this.recomputeContractName();
  }

  /** Al cambiar la partida de control se reinicia la partida (cascada). */
  onWorkItemCategoryChange(workItemCategoryId: number): void {
    this.createDto.workItemCategoryId = workItemCategoryId;
    this.createDto.workItemId = 0;
    this.recomputeContractName();
  }

  onContractModalityChange(contractModalityId: number | null): void {
    this.createDto.contractModalityId = contractModalityId;
    this.recomputeContractName();
  }

  toggleSubcontract(): void {
    this.createDto.isSubcontract = !this.createDto.isSubcontract;
    this.recomputeContractName();
  }

  toggleLabor(): void {
    this.createDto.isLabor = !this.createDto.isLabor;
    this.recomputeContractName();
  }

  onContractNameInput(value: string): void {
    this.createDto.contractWorkItemName = value;
    this.nameManuallyEdited = true;
  }

  /** Vuelve al nombre autogenerado descartando la edición manual. */
  regenerateContractName(): void {
    this.nameManuallyEdited = false;
    this.recomputeContractName();
  }

  getFormData() {
    this.loaderService.show();
    this.adjudicacionesService.getFormData().subscribe({
      next: (response) => {
        this.createFormData = response;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      }
    })
  }

  private getMissingFields(): string[] {
    const missing: string[] = [];
    if (!this.createDto.projectId)         missing.push('Proyecto');
    if (!this.createDto.contractorId)      missing.push('Empresa / Subcontratista');
    else if (this.contractorEmails.length === 0)
      missing.push('La empresa seleccionada no tiene correos registrados — agrégalos antes de continuar');
    if (!this.createDto.workSpecialtyId)   missing.push('Especialidad');
    if (!this.createDto.workItemCategoryId) missing.push('Partida de control');
    if (!this.createDto.workItemId)        missing.push('Partida');
    if (!this.createDto.contractWorkItemName?.trim()) missing.push('Nombre de la partida en el contrato');
    if (!this.createDto.contractModalityId) missing.push('Modalidad de contrato');
    if (!this.createDto.contractTypeId)    missing.push('Tipo de contrato');
    if (!this.createDto.amount)            missing.push('Monto');
    if (!this.createDto.currencyId)        missing.push('Moneda');
    if (!this.createDto.paymentMethodId)   missing.push('Modalidad de pago');
    if (!this.createDto.paymentFormId)     missing.push('Forma de pago');
    if (this.createDto.paymentMethodId === 2 && !this.createDto.advancePercentage)
      missing.push('Porcentaje de adelanto');
    return missing;
  }

  save() {
    this.submitted = true;
    const missing = this.getMissingFields();
    if (missing.length > 0) {
      Swal.fire({
        title: 'Campos requeridos',
        html: `<ul class="text-left text-sm list-disc pl-4">${missing.map(f => `<li>${f}</li>`).join('')}</ul>`,
        icon: 'warning',
        confirmButtonColor: '#64BC04',
      });
      return;
    }
    const form = new FormData();
    form.append('projectId', this.createDto.projectId.toString());
    form.append('contractorId', this.createDto.contractorId.toString());
    form.append('contractTypeId', this.createDto.contractTypeId.toString());
    if (this.createDto.contractModalityId != null) {
      form.append('contractModalityId', this.createDto.contractModalityId.toString());
    }
    form.append('paymentMethodId', this.createDto.paymentMethodId.toString());
    if (this.createDto.paymentFormId != null) {
      form.append('paymentFormId', this.createDto.paymentFormId.toString());
    }
    // Carta de fianza solo aplica en Suministro (modalidad 2) + contrato con adelanto (pago 2)
    const includesCartaFianza =
      this.createDto.contractModalityId === 2 && this.createDto.paymentMethodId === 2 && !!this.createDto.includesCartaFianza;
    form.append('includesCartaFianza', includesCartaFianza.toString());
    if (this.createDto.paymentMethodId === 2 && this.createDto.advancePercentage != null) {
      form.append('advancePercentage', this.createDto.advancePercentage.toString());
      if (this.advanceAmount != null) {
        form.append('advanceAmount', this.advanceAmount.toString());
      }
    }
    form.append('amount', this.createDto.amount.toString());
    form.append('currencyId', this.createDto.currencyId.toString());
    form.append('hasIgv', this.createDto.hasIgv.toString());
    form.append('workItemId', this.createDto.workItemId.toString());
    form.append('workItemCategoryId', this.createDto.workItemCategoryId.toString());
    if (this.createDto.workSpecialtyId != null) {
      form.append('workSpecialtyId', this.createDto.workSpecialtyId.toString());
    }
    form.append('isSubcontract', this.createDto.isSubcontract.toString());
    form.append('isLabor', this.createDto.isLabor.toString());
    form.append('contractWorkItemName', (this.createDto.contractWorkItemName ?? '').trim());
    this.createDto.quotationFiles?.forEach(f => form.append('quotationFiles', f));
    this.createDto.comparativeFiles?.forEach(f => form.append('comparativeFiles', f));

    this.loaderService.show();
    this.adjudicacionesService.createAdjudicacion(form).subscribe({
      next: (response) => {
        this.loaderService.hide();
        Swal.fire({ title: response.message ?? 'Adjudicación creada exitosamente', icon: 'success', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      }
    });
  }

  onAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const match = input.value.match(/^\d*\.?\d{0,6}/);
    let clamped = match ? match[0] : '';
    if (input.value !== clamped) {
      input.value = clamped;
    }
    this.createDto.amount = clamped !== '' ? parseFloat(clamped) : 0;

    // Recalculate advance amount whenever the base amount changes
    this.advanceAmount = null as any;
    this.cdr.detectChanges();
    if (this.createDto.advancePercentage != null && this.createDto.amount) {
      const raw = (this.createDto.advancePercentage / 100) * this.createDto.amount;
      this.advanceAmount = Math.round(raw * 1_000_000) / 1_000_000;
    } else {
      this.advanceAmount = undefined;
    }
  }

  onPercentageInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const match = input.value.match(/^\d*\.?\d{0,6}/);
    let clamped = match ? match[0] : '';
    const numeric = parseFloat(clamped);
    if (!isNaN(numeric) && numeric > 100) {
      clamped = '100';
    }
    if (input.value !== clamped) {
      input.value = clamped;
    }
    this.createDto.advancePercentage = clamped !== '' ? parseFloat(clamped) : undefined;

    // Reset to null first so Angular replaces the DOM value of the other input
    // instead of skipping the update because the reference looks the same.
    this.advanceAmount = null as any;
    this.cdr.detectChanges();

    if (this.createDto.advancePercentage != null && this.createDto.amount) {
      // Math.round is safe here: pct→amount can never accidentally reach the total
      const raw = (this.createDto.advancePercentage / 100) * this.createDto.amount;
      this.advanceAmount = Math.round(raw * 1_000_000) / 1_000_000;
    } else {
      this.advanceAmount = undefined;
    }
  }

  onAdvanceAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const match = input.value.match(/^\d*\.?\d{0,6}/);
    let clamped = match ? match[0] : '';
    const numeric = parseFloat(clamped);
    if (!isNaN(numeric) && this.createDto.amount && numeric > this.createDto.amount) {
      clamped = this.createDto.amount.toString();
    }
    if (input.value !== clamped) {
      input.value = clamped;
    }
    this.advanceAmount = clamped !== '' ? parseFloat(clamped) : undefined;

    // Reset to null first so Angular replaces the DOM value of the other input
    // instead of skipping the update because the reference looks the same.
    this.createDto.advancePercentage = null as any;
    this.cdr.detectChanges();

    if (this.advanceAmount != null && this.createDto.amount) {
      // Math.floor to prevent e.g. 499.9999 / 500 rounding up to 100%.
      // 1e-9 epsilon corrects IEEE 754 cases where x*1_000_000 lands just
      // below an integer (e.g. 4.9999999...) without affecting real values.
      const raw = (this.advanceAmount / this.createDto.amount) * 100;
      this.createDto.advancePercentage = Math.floor(raw * 1_000_000 + 1e-9) / 1_000_000;
    } else {
      this.createDto.advancePercentage = undefined;
    }
  }
}
