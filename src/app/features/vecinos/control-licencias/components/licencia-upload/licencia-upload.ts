import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ControlLicenciasService } from '../../services/control-licencias.service';
import { VecinoLicenciaItemDTO } from '../../dtos/control-licencias.dto';

@Component({
  selector: 'app-licencia-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel],
  templateUrl: './licencia-upload.html',
})
export class LicenciaUpload implements OnInit {
  @Input({ required: true }) projectId!: number;
  @Input({ required: true }) item!: VecinoLicenciaItemDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() uploaded = new EventEmitter<void>();

  fechaVencimiento = '';
  selectedFile: File | null = null;

  /** Recordatorios a crear (días de antelación). Se precarga con el de la licencia vigente, o con el default del tipo. */
  diasAntesLista: number[] = [];
  nuevoDiasAntes: number | null = null;

  constructor(
    private service: ControlLicenciasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.diasAntesLista = this.item.recordatorios.length > 0
      ? this.item.recordatorios.map((r) => r.diasAntes)
      : this.item.diasAntesDefault != null
        ? [this.item.diasAntesDefault]
        : [];
  }

  agregarDiasAntes(): void {
    if (this.nuevoDiasAntes == null || this.nuevoDiasAntes < 0) return;
    if (!this.diasAntesLista.includes(this.nuevoDiasAntes)) {
      this.diasAntesLista = [...this.diasAntesLista, this.nuevoDiasAntes].sort((a, b) => b - a);
    }
    this.nuevoDiasAntes = null;
  }

  quitarDiasAntes(dias: number): void {
    this.diasAntesLista = this.diasAntesLista.filter((d) => d !== dias);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  close(): void {
    this.closeModal.emit();
  }

  guardar(): void {
    if (!this.selectedFile) {
      Swal.fire({ icon: 'warning', title: 'Adjunta el archivo', confirmButtonColor: '#0F6E56' });
      return;
    }
    if (!this.fechaVencimiento) {
      Swal.fire({ icon: 'warning', title: 'Completa la fecha de vencimiento', confirmButtonColor: '#0F6E56' });
      return;
    }
    if (this.diasAntesLista.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Agrega al menos un recordatorio', confirmButtonColor: '#0F6E56' });
      return;
    }

    this.loaderService.show();
    this.service
      .uploadLicencia(
        this.projectId,
        this.item.vecinoLicenciaControlTipoId,
        { fechaVencimiento: this.fechaVencimiento, diasAntesRecordatorio: this.diasAntesLista },
        this.selectedFile,
      )
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.uploaded.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }
}
