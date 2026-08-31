import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ControlLicenciasService } from '../../services/control-licencias.service';
import { VecinoLicenciaItemDTO, VecinoLicenciaHistorialItemDTO } from '../../dtos/control-licencias.dto';

@Component({
  selector: 'app-licencia-historial',
  standalone: true,
  imports: [CommonModule, AbrilModalPanel],
  templateUrl: './licencia-historial.html',
})
export class LicenciaHistorial implements OnInit {
  @Input({ required: true }) projectId!: number;
  @Input({ required: true }) item!: VecinoLicenciaItemDTO;
  @Output() closeModal = new EventEmitter<void>();

  historial: VecinoLicenciaHistorialItemDTO[] = [];
  loaded = false;

  constructor(
    private service: ControlLicenciasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getHistorial(this.projectId, this.item.vecinoLicenciaControlTipoId).subscribe({
      next: (res) => {
        this.historial = res;
        this.loaded = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  fileUrl(url: string): string {
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  close(): void {
    this.closeModal.emit();
  }
}
