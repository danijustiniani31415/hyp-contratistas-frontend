import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { InvoiceFolderService } from '../services/invoice-folder.service';
import { InvoiceFolderDto } from '../dtos/invoice-folder.dto';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

/**
 * Subsección "Carpeta facturas" de la Configuración de Contabilidad.
 * Existe un único registro: el usuario pega un link de SharePoint/OneDrive, el sistema lo
 * detecta (resuelve la carpeta vía Graph) y a partir de ahí todas las facturas se guardan ahí.
 */
@Component({
  selector: 'app-invoice-folder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoice-folder.html',
})
export class InvoiceFolder implements OnInit {
  folder: InvoiceFolderDto | null = null;
  linkUrl = '';

  constructor(
    private service: InvoiceFolderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getSingleton().subscribe({
      next: (res) => {
        this.folder = res;
        this.linkUrl = res?.linkUrl ?? '';
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  save(): void {
    if (!this.linkUrl.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingresa el link de la carpeta (SharePoint u OneDrive).' });
      return;
    }

    this.loaderService.show();
    this.service.save(this.linkUrl.trim()).subscribe({
      next: (res) => {
        this.folder = res;
        this.linkUrl = res.linkUrl;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Carpeta configurada',
          text: res.folderName ? `Se guardará todo en: ${res.folderName}` : 'Carpeta detectada y guardada exitosamente.',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
