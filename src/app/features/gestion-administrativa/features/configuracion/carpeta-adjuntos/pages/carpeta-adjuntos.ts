import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { CarpetaAdjuntosService } from '../services/carpeta-adjuntos.service';
import { GaAdjuntoFolderDto } from '../dtos/ga-adjunto-folder.dto';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

/**
 * Sección "Carpeta Adjuntos" de la Configuración de Gestión Administrativa.
 * Existe un único registro: el usuario pega un link de SharePoint/OneDrive, el sistema lo
 * detecta (resuelve la carpeta vía Graph) y a partir de ahí los documentos adjuntos de las
 * solicitudes de salida (motivos con "requiere documento adjunto") se guardan ahí.
 * Mismo patrón que la Carpeta facturas de Contabilidad.
 */
@Component({
  selector: 'app-ga-carpeta-adjuntos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './carpeta-adjuntos.html',
})
export class GaCarpetaAdjuntos implements OnInit {
  folder: GaAdjuntoFolderDto | null = null;
  linkUrl = '';

  // Contrato del contenedor GaConfiguracion (esta sección no tiene tabla ni filtros).
  filtrosActivos = 0;
  filtrosAbiertos = false;

  constructor(
    private service: CarpetaAdjuntosService,
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
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
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
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
