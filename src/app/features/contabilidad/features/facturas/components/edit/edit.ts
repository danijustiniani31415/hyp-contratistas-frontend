import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

import { InvoiceService } from '../../services/invoice.service';
import {
  InvoiceDetailDto,
  InvoiceSupplierDto,
  InvoicePaymentFormDto,
  InvoiceCurrencyDto,
} from '../../dtos/invoice.dtos';

@Component({
  selector: 'app-factura-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect, FileSelector],
  templateUrl: './edit.html',
})
export class FacturaEdit implements OnInit {
  @Input() detail!: InvoiceDetailDto;
  @Input() suppliers: InvoiceSupplierDto[] = [];
  @Input() paymentForms: InvoicePaymentFormDto[] = [];
  @Input() abrilCompanies: InvoiceSupplierDto[] = [];
  @Input() currencies: InvoiceCurrencyDto[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  form = {
    issueDate: '',
    serie: '',
    correlativo: '',
    contributorId: null as number | null,
    abrilContributorId: null as number | null,
    description: '',
    invoicePaymentFormId: null as number | null,
    currencyId: null as number | null,
    total: null as number | null,
  };
  /** RUC del proveedor sincronizado con el desplegable. */
  supplierRuc = '';
  documentFile: File | null = null;
  documentName = '';

  constructor(
    private service: InvoiceService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    const d = this.detail;
    this.form = {
      issueDate: d.issueDate,
      serie: d.serie,
      correlativo: d.correlativo,
      contributorId: d.contributorId,
      abrilContributorId: d.abrilContributorId ?? null,
      description: d.description,
      invoicePaymentFormId: d.invoicePaymentFormId,
      currencyId: d.currencyId ?? null,
      total: d.total,
    };
    this.supplierRuc = d.contributorRuc;
  }

  onSupplierChange(contributorId: number | null): void {
    this.form.contributorId = contributorId;
    const s = this.suppliers.find((x) => x.contributorId === contributorId);
    this.supplierRuc = s ? s.contributorRuc : '';
  }

  onRucChange(ruc: string): void {
    this.supplierRuc = ruc;
    const s = this.suppliers.find((x) => x.contributorRuc === ruc.trim());
    this.form.contributorId = s ? s.contributorId : null;
  }

  onFileSelected(file: SelectedFile): void {
    this.documentFile = file.file;
    this.documentName = file.file.name;
  }

  removeFile(): void {
    this.documentFile = null;
    this.documentName = '';
  }

  save(): void {
    if (!this.form.issueDate) return this.requiredAlert('Ingrese la fecha de emisión.');
    if (!this.form.serie.trim()) return this.requiredAlert('Ingrese la serie de la factura.');
    if (!this.form.correlativo.trim()) return this.requiredAlert('Ingrese el correlativo de la factura.');
    if (!/^\d+$/.test(this.form.correlativo.trim())) return this.requiredAlert('El correlativo debe ser numérico.');
    if (!this.form.contributorId) return this.requiredAlert('Seleccione un proveedor.');
    if (!this.form.abrilContributorId) return this.requiredAlert('Seleccione la razón social de Abril.');
    if (!this.form.description.trim()) return this.requiredAlert('Ingrese la descripción del bien o servicio.');
    if (!this.form.invoicePaymentFormId) return this.requiredAlert('Seleccione la forma de pago.');
    if (!this.form.currencyId) return this.requiredAlert('Seleccione la moneda.');
    if (this.form.total == null || this.form.total <= 0) return this.requiredAlert('Ingrese un total válido.');

    const formData = new FormData();
    formData.append('InvoiceId', this.detail.invoiceId.toString());
    formData.append('IssueDate', this.form.issueDate);
    formData.append('Serie', this.form.serie.trim());
    formData.append('Correlativo', this.form.correlativo.trim());
    formData.append('ContributorId', this.form.contributorId.toString());
    formData.append('AbrilContributorId', this.form.abrilContributorId.toString());
    formData.append('Description', this.form.description.trim());
    formData.append('InvoicePaymentFormId', this.form.invoicePaymentFormId.toString());
    formData.append('CurrencyId', this.form.currencyId.toString());
    formData.append('Total', this.form.total.toString());
    if (this.documentFile) formData.append('DocumentFile', this.documentFile, this.documentFile.name);

    this.loaderService.show();
    this.service.update(formData).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Factura actualizada exitosamente', timer: 1500, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private requiredAlert(text: string): void {
    Swal.fire({ icon: 'error', title: 'Campo requerido', text });
  }
}
