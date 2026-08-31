import { Component, ChangeDetectorRef, OnInit, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent, AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { FileSelector, SelectedFile } from '../../../../shared/components/file-selector/file-selector';
import { FilePreview, FilePreviewItem } from '../../../../shared/components/file-preview/file-preview';
import { ImagePreview } from '../../../../shared/components/image-preview/image-preview';
import { HttpErrorResponse } from '@angular/common/http';
import { ContractorService } from '../services/contractor.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { SunatContributorDTO } from '../../shared/sunatCompany.model';
import { ReniecPersonDTO } from '../../shared/reniecPerson.model';
import { ContributorRegisterDTO, EmailContactItem } from '../dtos/companyRegister.model';
import { ContractorPersonTypeDTO } from '../../shared/contractorPersonType.model';
import { isValidContractorEmail } from '../../shared/email-validation';
import Swal from 'sweetalert2';

/** Campos de archivo del formulario (uno por campo). */
type FileField = 'logoFile' | 'brochureFile' | 'fichaRucFile' | 'referencesListFile';

@Component({
  selector: 'app-contractor-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, AbrilPageHeaderComponent, FileSelector, FilePreview, ImagePreview],
  templateUrl: './contractor-registration.html',
  styleUrl: './contractor-registration.css',
})
export class ContractorRegistration implements OnInit {
  readonly currentYear = new Date().getFullYear();

  /**
   * "Modo interno": la ruta /contractors/registro-interno (dentro del shell) fija
   * data.modoInterno=true. En ese modo el formulario se muestra con el header de
   * pestañas del shell y el logo es OPCIONAL (lo usa el personal del sistema).
   * En la ruta pública /contractors/registro (contratista externo vía login) el
   * flag viene ausente → modo público, standalone, con el logo OBLIGATORIO.
   */
  modoInterno = false;
  logoRequerido = true;

  /** Marca en el <host> la clase que activa el layout flex del shell (solo modo interno). */
  @HostBinding('class.registro-shell') get esModoInterno() { return this.modoInterno; }

  /** Pestañas del header en modo interno (mismas que Homologación). */
  readonly contractorTabs: AbrilPageTab[] = [
    { label: 'Registro de contratistas',     icono: 'ti-file-plus',       route: '/contractors/registro-interno', featureKey: 'contractors.registro' },
    { label: 'Homologación de contratistas', icono: 'ti-clipboard-check', route: '/contractors/management',        featureKey: 'contractors.management' },
  ];

  // Person types (clasificaciones de correo)
  personTypes: ContractorPersonTypeDTO[] = [];

  // RUC search
  rucInput = '';
  sunatData: SunatContributorDTO | null = null;

  // DNI search
  dniInput = '';
  reniecData: ReniecPersonDTO | null = null;
  dniLookupLoading = false;

  form: ContributorRegisterDTO = {
    contributorRuc: '',
    contributorName: '',
    address: '',
    contributorDistrict: null,
    contributorProvince: null,
    contributorDepartment: null,
    economicActivityDescription: '',
    legalRepresentativeDni: null,
    legalRepresentativeFullName: null,
    legalEntityRegistryNumber: null,
  };

  // Emails con clasificación
  emailItems: EmailContactItem[] = [{ email: '', personTypeId: null }];

  // Archivos (un solo archivo por campo)
  logoFile: File | null = null;
  brochureFile: File | null = null;
  fichaRucFile: File | null = null;
  referencesListFile: File | null = null;

  /** Items para app-file-preview (0 o 1 por campo), en paralelo a los File de arriba.
   *  El logo NO usa file-preview sino app-image-preview (logoPreviews) para ver la imagen. */
  fileItems: Record<FileField, FilePreviewItem[]> = {
    logoFile: [],
    brochureFile: [],
    fichaRucFile: [],
    referencesListFile: [],
  };

  /** URL(s) de vista previa del logo para app-image-preview (0 o 1). */
  logoPreviews: string[] = [];

  constructor(
    private contractorService: ContractorService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.modoInterno = this.route.snapshot.data['modoInterno'] === true;
    this.logoRequerido = !this.modoInterno;

    this.loaderService.show();
    this.contractorService.getPersonTypes().subscribe({
      next: (types) => {
        this.personTypes = types;
        this.loaderService.hide();
      },
      error: () => {
        this.loaderService.hide(); // no bloquear el formulario si falla
      },
    });
  }

  // ── Navegación ────────────────────────────────────────────────────
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  // ── RUC ──────────────────────────────────────────────────────────
  searchSunat() {
    if (this.rucInput.length !== 11) return;
    this.loaderService.show();
    this.sunatData = null;
    this.contractorService.getCompanyBySunat(this.rucInput).subscribe({
      next: (data) => {
        this.sunatData = data;
        this.form.contributorRuc = data.contributorRuc;
        this.form.contributorName = data.contributorName;
        this.form.address = data.contributorAddress;
        this.form.contributorDistrict   = data.contributorDistrict   ?? null;
        this.form.contributorProvince   = data.contributorProvince   ?? null;
        this.form.contributorDepartment = data.contributorDepartment ?? null;
        this.form.economicActivityDescription = data.contributorEconomicActivityDescription;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        const backendMsg = err.error?.message as string | undefined;
        if (err.status !== 404 && backendMsg) {
          Swal.fire({ icon: 'warning', title: 'No se pudo consultar', text: backendMsg });
          return;
        }
        this.errorService.handleError(err);
      },
    });
  }

  onRucKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.searchSunat();
  }

  // ── DNI ──────────────────────────────────────────────────────────
  searchReniec() {
    if (this.dniInput.length !== 8) return;
    this.dniLookupLoading = true;
    this.contractorService.getPersonByDni(this.dniInput).subscribe({
      next: (data) => {
        this.reniecData = data;
        this.form.legalRepresentativeDni = data.document_number;
        this.form.legalRepresentativeFullName = `${data.first_name} ${data.first_last_name} ${data.second_last_name}`.trim();
        this.dniLookupLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.dniLookupLoading = false;
        if (err.status === 404) {
          Swal.fire({ icon: 'error', title: 'DNI no encontrado', text: 'No se encontró información para el DNI ingresado.' });
          return;
        }
        const backendMsg = err.error?.message as string | undefined;
        if (backendMsg) {
          Swal.fire({ icon: 'warning', title: 'No se pudo consultar', text: backendMsg });
          return;
        }
        this.errorService.handleError(err);
      },
    });
  }

  onDniKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') { this.searchReniec(); return; }
    this.blockNonDigits(event);
  }

  onNumericKeydown(event: KeyboardEvent) {
    this.blockNonDigits(event);
  }

  private blockNonDigits(event: KeyboardEvent): void {
    // Permitir teclas de control: Backspace, Delete, Tab, flechas, Ctrl+A/C/V/X, etc.
    const isControl = event.ctrlKey || event.metaKey || event.altKey;
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (isControl || allowed.includes(event.key)) return;
    // Bloquear todo lo que no sea dígito (0-9)
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  clearReniec() {
    this.reniecData = null;
    this.dniInput = '';
    this.form.legalRepresentativeDni = null;
    this.form.legalRepresentativeFullName = null;
  }

  // ── Emails ───────────────────────────────────────────────────────
  addEmail() {
    this.emailItems.push({ email: '', personTypeId: null });
  }

  removeEmail(index: number) {
    if (this.emailItems.length > 1) {
      this.emailItems.splice(index, 1);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  // ── Archivos (logo, brochure, ficha RUC, lista de referencias) ────
  // Todos usan el componente compartido app-file-selector + app-file-preview.
  // Cada campo admite un solo archivo: al seleccionar se reemplaza el anterior.
  onFileSelected(sel: SelectedFile, field: FileField): void {
    this[field] = sel.file;
    this.fileItems[field] = [{ name: sel.file.name, size: this.formatFileSize(sel.file.size) }];
    // El logo se muestra como imagen (app-image-preview), no como fila de archivo.
    if (field === 'logoFile') this.logoPreviews = [sel.preview];
  }

  removeFile(field: FileField): void {
    if (field === 'logoFile') {
      if (this.logoPreviews[0]) URL.revokeObjectURL(this.logoPreviews[0]);
      this.logoPreviews = [];
    }
    this[field] = null;
    this.fileItems[field] = [];
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // ── Validation ───────────────────────────────────────────────────
  private getValidationErrors(): string[] {
    const errors: string[] = [];

    // Empresa
    if (!this.form.contributorRuc?.trim())                errors.push('RUC');
    if (!this.form.contributorName?.trim())               errors.push('Razón social');
    if (!this.form.address?.trim())                       errors.push('Dirección');
    if (!this.form.contributorDistrict?.trim())           errors.push('Distrito');
    if (!this.form.contributorProvince?.trim())           errors.push('Provincia');
    if (!this.form.contributorDepartment?.trim())         errors.push('Departamento');
    if (!this.form.economicActivityDescription?.trim())   errors.push('Actividad económica');

    // Representante legal
    // Se acepta el DNI si fue consultado (form) o simplemente escrito (dniInput)
    if (!this.form.legalRepresentativeDni?.trim() && !this.dniInput?.trim())
      errors.push('DNI del representante legal');
    if (!this.form.legalRepresentativeFullName?.trim())   errors.push('Nombre completo del representante legal');
    if (!this.form.legalEntityRegistryNumber?.trim())     errors.push('N° de partida registral');

    // Correos
    this.emailItems.forEach((item, i) => {
      if (!item.email?.trim())
        errors.push(`Correo ${i + 1}`);
      else if (!isValidContractorEmail(item.email))
        errors.push(`Correo ${i + 1} (solo letras, números, "@", ".", "_" y "-", sin empezar ni terminar con símbolos)`);
      else if (item.personTypeId == null)
        errors.push(`Clasificación del correo ${i + 1}`);
    });

    // Logo: obligatorio para el contratista (ruta pública), opcional en modo interno.
    if (this.logoRequerido && !this.logoFile) errors.push('Logo de la empresa');

    // Documentos
    if (!this.brochureFile)       errors.push('Brochure');
    if (!this.fichaRucFile)       errors.push('Ficha RUC');
    if (!this.referencesListFile) errors.push('Lista de referencias');

    return errors;
  }

  // ── Submit ───────────────────────────────────────────────────────
  submit() {
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      const listHtml = errors.map(e => `<li>${e}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        html: `<p style="font-size:0.85rem;color:#666;margin-bottom:8px">Por favor completa los siguientes campos:</p>
               <ul style="text-align:left;font-size:0.85rem;padding-left:1.4rem;line-height:2">${listHtml}</ul>`,
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    // Si el usuario escribió el DNI sin consultar RENIEC, sincronizarlo al form
    if (!this.form.legalRepresentativeDni?.trim() && this.dniInput?.trim()) {
      this.form.legalRepresentativeDni = this.dniInput.trim();
    }

    // Antes de enviar, verificar si el RUC ya existe. Si existe, se ofrece (en naranja)
    // mandar una solicitud de actualización de datos en vez de bloquear el registro.
    this.loaderService.show();
    this.contractorService.checkRucExists(this.form.contributorRuc).subscribe({
      next: (status) => {
        this.loaderService.hide();
        if (status.exists) {
          const nombre = status.contributorName ? ` (${status.contributorName})` : '';
          Swal.fire({
            icon: 'warning',
            title: 'Contratista ya registrado',
            html: `Ya existe un contratista registrado con el RUC <b>${this.form.contributorRuc}</b>${nombre}.<br><br>
                   ¿Deseas enviar de todas maneras una <b>solicitud de actualización de datos</b>?
                   El área de costos deberá revisarla antes de que los nuevos datos entren en vigencia.`,
            showCancelButton: true,
            confirmButtonText: 'Sí, enviar solicitud',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#64BC04',
          }).then((result) => {
            if (result.isConfirmed) this.sendRegistration(true);
          });
        } else {
          this.sendRegistration(false);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  private sendRegistration(isUpdateRequest: boolean): void {
    this.loaderService.show();

    const formData = new FormData();
    formData.append('IsUpdateRequest', isUpdateRequest ? 'true' : 'false');
    // Regla de RUTA: solo el registro interno (/contractors/registro-interno) notifica
    // por correo al equipo de Costos; la ruta pública (/contractors/registro) no.
    formData.append('IsInternalRegistration', this.modoInterno ? 'true' : 'false');
    formData.append('GraphAccessToken', localStorage.getItem('graph_access_token') ?? '');
    formData.append('ContributorRuc', this.form.contributorRuc);
    formData.append('ContributorName', this.form.contributorName);
    formData.append('ContributorAddress', this.form.address!);
    formData.append('ContributorDistrict', this.form.contributorDistrict!);
    formData.append('ContributorProvince', this.form.contributorProvince!);
    formData.append('ContributorDepartment', this.form.contributorDepartment!);
    formData.append('ContributorEconomicActivityDescription', this.form.economicActivityDescription!);
    formData.append('LegalRepresentativeDni', this.form.legalRepresentativeDni!);
    formData.append('LegalRepresentativeFullName', this.form.legalRepresentativeFullName!);
    formData.append('LegalEntityRegistryNumber', this.form.legalEntityRegistryNumber!);

    // Correos + clasificaciones (listas paralelas)
    this.emailItems.forEach(item => {
      formData.append('ContributorEmails', item.email);
      formData.append('ContributorEmailPersonTypeIds', item.personTypeId != null ? item.personTypeId.toString() : '');
    });

    if (this.logoFile)           formData.append('LogoFile',          this.logoFile,          this.logoFile.name);
    if (this.brochureFile)       formData.append('BrochureFile',      this.brochureFile,      this.brochureFile.name);
    if (this.fichaRucFile)       formData.append('FichaRucFile',      this.fichaRucFile,      this.fichaRucFile.name);
    if (this.referencesListFile) formData.append('ReferencesListFile', this.referencesListFile, this.referencesListFile.name);

    this.contractorService.register(formData).subscribe({
      next: (response) => {
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: isUpdateRequest ? '¡Solicitud de actualización enviada!' : '¡Solicitud enviada!',
          text:
            response.message ??
            (isUpdateRequest
              ? 'Tu solicitud de actualización fue recibida. El área de costos la revisará.'
              : 'Tu solicitud fue recibida. Te contactaremos pronto.'),
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
