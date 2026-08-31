import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { InvoiceService } from '../../services/invoice.service';
import { InvoiceDetailDto } from '../../dtos/invoice.dtos';

@Component({
  selector: 'app-factura-detail',
  standalone: true,
  imports: [CommonModule, BaseModal],
  templateUrl: './detail.html',
})
export class FacturaDetail implements OnInit {
  @Input() invoiceId!: number;

  @Output() closeModal = new EventEmitter<void>();
  @Output() edit = new EventEmitter<InvoiceDetailDto>();

  detail: InvoiceDetailDto | null = null;
  safeDocUrl: SafeResourceUrl | null = null;
  /** true si el documento es una imagen (se muestra con <img>). */
  isImage = false;
  /** true si se puede intentar incrustar (no es un link de SharePoint/OneDrive). */
  canEmbed = false;

  constructor(
    private service: InvoiceService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getDetail(this.invoiceId).subscribe({
      next: (d) => {
        this.detail = d;
        this.resolveDocument(d.documentUrl ?? null);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.closeModal.emit();
      },
    });
  }

  private resolveDocument(url: string | null): void {
    if (!url) return;
    const lower = url.toLowerCase();
    this.isImage = /\.(png|jpe?g|webp|gif)(\?|$)/.test(lower);
    // Los enlaces de SharePoint/OneDrive no se pueden incrustar (X-Frame-Options).
    const isSharePoint = lower.includes('sharepoint.com') || lower.includes('-my.sharepoint');
    this.canEmbed = !isSharePoint;
    if (this.canEmbed) {
      this.safeDocUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }

  onEdit(): void {
    if (this.detail) this.edit.emit(this.detail);
  }
}
