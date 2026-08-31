import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { InvoiceService } from '../../services/invoice.service';
import { InvoiceDto } from '../../dtos/invoice.dtos';

@Component({
  selector: 'app-factura-attach',
  standalone: true,
  imports: [CommonModule, BaseModal, FileSelector],
  templateUrl: './attach.html',
})
export class FacturaAttach {
  @Input() invoice!: InvoiceDto;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  file: File | null = null;
  fileName = '';

  constructor(
    private service: InvoiceService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  onFileSelected(sel: SelectedFile): void {
    this.file = sel.file;
    this.fileName = sel.file.name;
  }

  removeFile(): void {
    this.file = null;
    this.fileName = '';
  }

  save(): void {
    if (!this.file) {
      Swal.fire({ icon: 'error', title: 'Falta el documento', text: 'Suelta o elige el archivo de la factura.' });
      return;
    }
    const formData = new FormData();
    formData.append('file', this.file, this.file.name);

    this.loaderService.show();
    this.service.uploadDocument(this.invoice.invoiceId, formData).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: res.message ?? 'Documento adjuntado', timer: 1600, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
