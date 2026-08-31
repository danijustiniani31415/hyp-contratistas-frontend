import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ControlLicenciasService } from '../../services/control-licencias.service';
import { VecinoLicenciaItemDTO, VecinoLicenciaRecordatorioDTO } from '../../dtos/control-licencias.dto';

@Component({
  selector: 'app-licencia-recordatorios',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel],
  templateUrl: './licencia-recordatorios.html',
})
export class LicenciaRecordatorios {
  @Input({ required: true }) projectId!: number;
  @Input({ required: true }) item!: VecinoLicenciaItemDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();

  nuevoDiasAntes: number | null = null;

  constructor(
    private service: ControlLicenciasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  close(): void {
    this.closeModal.emit();
  }

  agregar(): void {
    if (this.nuevoDiasAntes == null || this.nuevoDiasAntes < 0) {
      Swal.fire({ icon: 'warning', title: 'Indica los días de antelación', confirmButtonColor: '#0F6E56' });
      return;
    }

    this.loaderService.show();
    this.service.addRecordatorio(this.projectId, this.item.vecinoLicenciaControlTipoId, { diasAntes: this.nuevoDiasAntes }).subscribe({
      next: (res) => {
        this.item.recordatorios = [...this.item.recordatorios, res.recordatorio].sort((a, b) => b.diasAntes - a.diasAntes);
        this.nuevoDiasAntes = null;
        this.loaderService.hide();
        this.changed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  async eliminar(r: VecinoLicenciaRecordatorioDTO): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar este recordatorio?',
      text: `${r.diasAntes} día(s) antes del vencimiento`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed) return;

    this.loaderService.show();
    this.service.deleteRecordatorio(r.vecinoLicenciaControlRecordatorioId).subscribe({
      next: () => {
        this.item.recordatorios = this.item.recordatorios.filter(
          (x) => x.vecinoLicenciaControlRecordatorioId !== r.vecinoLicenciaControlRecordatorioId,
        );
        this.loaderService.hide();
        this.changed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
