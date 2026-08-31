import { Component, ChangeDetectorRef, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { ContractorEmailItemDTO, ContractorManagementDTO } from '../../dtos/contractor-management.dto';
import { isValidContractorEmail } from '../../../shared/email-validation';
import { SunatContributorDTO } from '../../../shared/sunatCompany.model';
import { ContractorPersonTypeDTO } from '../../../shared/contractorPersonType.model';
import { ReniecPersonDTO } from '../../../shared/reniecPerson.model';
import { ContractorManagementService } from '../../services/contractor-management.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import Swal from 'sweetalert2';

/** Documentos adjuntos editables (clave usada por el drag & drop). */
type EditDocKey = 'logo' | 'brochure' | 'fichaRuc' | 'references';

@Component({
  selector: 'app-contractor-management-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './contractor-management-edit.html',
})
export class ContractorManagementEdit implements OnInit {
  @Input() item!: ContractorManagementDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild('logoInput')        logoInput!:        ElementRef<HTMLInputElement>;
  @ViewChild('brochureInput')    brochureInput!:    ElementRef<HTMLInputElement>;
  @ViewChild('fichaRucInput')    fichaRucInput!:    ElementRef<HTMLInputElement>;
  @ViewChild('referencesInput')  referencesInput!:  ElementRef<HTMLInputElement>;

  // Campos de texto
  contributorRuc = '';
  contributorName = '';
  contributorAddress = '';
  contributorEconomicActivityDescription = '';
  contributorDistrict = '';
  contributorProvince = '';
  contributorDepartment = '';
  legalEntityRegistryNumber = '';
  legalRepresentativeDni = '';
  legalRepresentativeFullName = '';

  // Consulta RUC (SUNAT) / DNI (RENIEC)
  rucInput = '';
  rucLookupLoading = false;
  dniLookupLoading = false;

  // Correos (con id y estado active; id null = correo nuevo)
  emails: ContractorEmailItemDTO[] = [];
  newEmail = '';
  newEmailPersonTypeId: number | null = null;

  // Catálogo de clasificaciones de correo (Gerente General, etc.)
  personTypes: ContractorPersonTypeDTO[] = [];

  // Archivos nuevos (null = no cambiar)
  logoFile: File | null = null;
  logoPreviewUrl: string | null = null;
  brochureFile: File | null = null;
  fichaRucFile: File | null = null;
  referencesFile: File | null = null;

  constructor(
    private service: ContractorManagementService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.contributorRuc                         = this.item.contributorRuc ?? '';
    this.rucInput                               = this.item.contributorRuc ?? '';
    this.contributorName                        = this.item.contributorName ?? '';
    this.contributorAddress                     = this.item.contributorAddress ?? '';
    this.contributorEconomicActivityDescription = this.item.contributorEconomicActivityDescription ?? '';
    this.contributorDistrict                    = this.item.contributorDistrict ?? '';
    this.contributorProvince                    = this.item.contributorProvince ?? '';
    this.contributorDepartment                  = this.item.contributorDepartment ?? '';
    this.legalEntityRegistryNumber              = this.item.legalEntityRegistryNumber ?? '';
    this.legalRepresentativeDni                 = this.item.legalRepresentativeDni ?? '';
    this.legalRepresentativeFullName            = this.item.legalRepresentativeFullName ?? '';
    // Se clona cada correo para no mutar el item original mientras se edita.
    this.emails = (this.item.emailDetails ?? []).map(e => ({ ...e }));

    this.service.getPersonTypes().subscribe({
      next: (types) => {
        this.personTypes = types;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Consulta RUC (SUNAT) ─────────────────────────────────────────────────────

  searchSunat(): void {
    const ruc = this.rucInput.trim();
    if (ruc.length !== 11) return;
    this.rucLookupLoading = true;
    this.loaderService.show();
    this.service.getCompanyBySunat(ruc).subscribe({
      next: (data: SunatContributorDTO) => {
        this.contributorRuc                         = data.contributorRuc;
        this.contributorName                        = data.contributorName;
        this.contributorAddress                     = data.contributorAddress;
        this.contributorEconomicActivityDescription = data.contributorEconomicActivityDescription;
        this.contributorDistrict                    = data.contributorDistrict   ?? '';
        this.contributorProvince                    = data.contributorProvince   ?? '';
        this.contributorDepartment                  = data.contributorDepartment ?? '';
        this.rucLookupLoading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.rucLookupLoading = false;
        this.loaderService.hide();
        if (err.status === 404) {
          Swal.fire({ icon: 'error', title: 'RUC no encontrado', text: 'No se encontró información para el RUC ingresado.', confirmButtonColor: '#64BC04' });
          return;
        }
        const backendMsg = err.error?.message as string | undefined;
        if (backendMsg) {
          Swal.fire({ icon: 'warning', title: 'No se pudo consultar', text: backendMsg, confirmButtonColor: '#64BC04' });
          return;
        }
        this.errorService.handleError(err);
      },
    });
  }

  onRucKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { this.searchSunat(); return; }
    this.blockNonDigits(event);
  }

  // ── Consulta DNI (RENIEC) ────────────────────────────────────────────────────

  searchReniec(): void {
    const dni = this.legalRepresentativeDni.trim();
    if (dni.length !== 8) return;
    this.dniLookupLoading = true;
    this.loaderService.show();
    this.service.getPersonByDni(dni).subscribe({
      next: (data: ReniecPersonDTO) => {
        this.legalRepresentativeDni      = data.document_number;
        this.legalRepresentativeFullName = `${data.first_name} ${data.first_last_name} ${data.second_last_name}`.trim();
        this.dniLookupLoading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.dniLookupLoading = false;
        this.loaderService.hide();
        if (err.status === 404) {
          Swal.fire({ icon: 'error', title: 'DNI no encontrado', text: 'No se encontró información para el DNI ingresado.', confirmButtonColor: '#64BC04' });
          return;
        }
        const backendMsg = err.error?.message as string | undefined;
        if (backendMsg) {
          Swal.fire({ icon: 'warning', title: 'No se pudo consultar', text: backendMsg, confirmButtonColor: '#64BC04' });
          return;
        }
        this.errorService.handleError(err);
      },
    });
  }

  onDniKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { this.searchReniec(); return; }
    this.blockNonDigits(event);
  }

  private blockNonDigits(event: KeyboardEvent): void {
    const isControl = event.ctrlKey || event.metaKey || event.altKey;
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (isControl || allowed.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  // ── Correos ────────────────────────────────────────────────────────────────

  addEmail(): void {
    // Se conserva tal cual se escribe (solo trim): los correos son sensibles a mayúsculas,
    // por lo que 'Correo@x.pe' y 'correo@x.pe' se consideran distintos.
    // El input tiene autocapitalize/autocorrect desactivados para que el navegador no
    // altere lo tecleado.
    const email = this.newEmail.trim();
    if (!email) return;
    if (!isValidContractorEmail(email)) {
      Swal.fire({ icon: 'error', title: 'Correo inválido', text: 'El correo solo puede contener letras, números, "@", ".", "_" y "-", y no puede empezar ni terminar con un símbolo.', confirmButtonColor: '#64BC04' });
      return;
    }
    if (this.emails.some(e => e.email === email)) {   // duplicado exacto (case-sensitive)
      this.newEmail = '';
      return;
    }
    this.emails.push({ contractorEmailId: null, email, active: true, contractorPersonTypeId: this.newEmailPersonTypeId });
    this.newEmail = '';
    this.newEmailPersonTypeId = null;
  }

  removeEmail(index: number): void {
    this.emails.splice(index, 1);
  }

  toggleActive(index: number): void {
    this.emails[index].active = !this.emails[index].active;
  }

  // ── Archivos ────────────────────────────────────────────────────────────────

  /** Documento sobre el que se está arrastrando un archivo (para el overlay de drop). */
  dragDoc: EditDocKey | null = null;

  /**
   * Contador dragenter/dragleave por documento. Necesario porque al mover el mouse sobre
   * los hijos de la tarjeta el navegador dispara dragleave del padre seguido de dragenter,
   * y usar solo dragover/dragleave produce un parpadeo del overlay.
   */
  private dragEnterCount: Record<string, number> = {};

  onDocDragEnter(key: EditDocKey, event: DragEvent): void {
    event.preventDefault();
    this.dragEnterCount[key] = (this.dragEnterCount[key] ?? 0) + 1;
    this.dragDoc = key;
  }

  onDocDragOver(_key: EditDocKey, event: DragEvent): void {
    // Necesario para permitir el drop; el estado visual lo maneja dragenter/dragleave.
    event.preventDefault();
  }

  onDocDragLeave(key: EditDocKey, event: DragEvent): void {
    event.preventDefault();
    const remaining = (this.dragEnterCount[key] ?? 1) - 1;
    this.dragEnterCount[key] = Math.max(remaining, 0);
    if (this.dragEnterCount[key] === 0 && this.dragDoc === key) this.dragDoc = null;
  }

  onDocDrop(key: EditDocKey, event: DragEvent): void {
    event.preventDefault();
    this.dragEnterCount[key] = 0;
    this.dragDoc = null;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setFile(key, file);
  }

  onLogoSelected(event: Event): void       { this.pickFromInput('logo', event); }
  onBrochureSelected(event: Event): void   { this.pickFromInput('brochure', event); }
  onFichaRucSelected(event: Event): void   { this.pickFromInput('fichaRuc', event); }
  onReferencesSelected(event: Event): void { this.pickFromInput('references', event); }

  private pickFromInput(key: EditDocKey, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.setFile(key, file);
  }

  /** Asigna el archivo (venga del input o de drag & drop) al campo correspondiente. */
  private setFile(key: EditDocKey, file: File): void {
    switch (key) {
      case 'logo': {
        this.logoFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.logoPreviewUrl = e.target?.result as string;
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
        break;
      }
      case 'brochure':   this.brochureFile = file;   break;
      case 'fichaRuc':   this.fichaRucFile = file;   break;
      case 'references': this.referencesFile = file; break;
    }
  }

  clearLogo(): void {
    this.logoFile = null;
    this.logoPreviewUrl = null;
    this.logoInput.nativeElement.value = '';
  }

  clearBrochure(): void {
    this.brochureFile = null;
    this.brochureInput.nativeElement.value = '';
  }

  clearFichaRuc(): void {
    this.fichaRucFile = null;
    this.fichaRucInput.nativeElement.value = '';
  }

  clearReferences(): void {
    this.referencesFile = null;
    this.referencesInput.nativeElement.value = '';
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  save(): void {
    if (!this.contributorName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'La razón social es obligatoria.', confirmButtonColor: '#64BC04' });
      return;
    }

    // Validar formato de todos los correos (pueden editarse en línea)
    const invalidEmail = this.emails.find(e => e.email.trim() && !isValidContractorEmail(e.email));
    if (invalidEmail) {
      Swal.fire({ icon: 'error', title: 'Correo inválido', text: `El correo "${invalidEmail.email.trim()}" no es válido. Solo puede contener letras, números, "@", ".", "_" y "-", y no puede empezar ni terminar con un símbolo.`, confirmButtonColor: '#64BC04' });
      return;
    }

    const form = new FormData();
    form.append('contributorRuc',                         this.contributorRuc.trim());
    form.append('contributorName',                        this.contributorName.trim());
    form.append('contributorAddress',                     this.contributorAddress.trim());
    form.append('contributorEconomicActivityDescription', this.contributorEconomicActivityDescription.trim());
    form.append('contributorDistrict',                    this.contributorDistrict.trim());
    form.append('contributorProvince',                    this.contributorProvince.trim());
    form.append('contributorDepartment',                  this.contributorDepartment.trim());
    form.append('legalEntityRegistryNumber',              this.legalEntityRegistryNumber.trim());
    form.append('legalRepresentativeDni',                 this.legalRepresentativeDni.trim());
    form.append('legalRepresentativeFullName',            this.legalRepresentativeFullName.trim());

    // Se envían los correos como JSON: cada uno con su id (null = nuevo) y su flag active.
    // Los correos existentes que ya no se envíen serán eliminados (soft-delete) en el backend.
    const emailsPayload = this.emails
      .map(e => ({
        contractorEmailId: e.contractorEmailId,
        email: e.email.trim(),
        active: e.active,
        contractorPersonTypeId: e.contractorPersonTypeId,
      }))
      .filter(e => e.email.length > 0);
    form.append('emailsJson', JSON.stringify(emailsPayload));

    if (this.logoFile)       form.append('logoFile',           this.logoFile);
    if (this.brochureFile)   form.append('brochureFile',       this.brochureFile);
    if (this.fichaRucFile)   form.append('fichaRucFile',       this.fichaRucFile);
    if (this.referencesFile) form.append('referencesListFile', this.referencesFile);

    this.loaderService.show();
    this.service.update(this.item.contractorId, form).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Contratista actualizado exitosamente.', confirmButtonColor: '#64BC04', draggable: true });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
