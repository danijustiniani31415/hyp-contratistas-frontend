import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { DatePicker } from '../../../../shared/components/date-picker/date-picker';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { DescansoAdjuntos } from '../shared/descanso-adjuntos/descanso-adjuntos';
import { MiSaludService } from './mi-salud.service';
import { DescansoTipoDto } from './mi-salud.dtos';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

@Component({
  selector: 'app-mi-salud-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilModalPanel, DatePicker, SearchSelect, DescansoAdjuntos],
  templateUrl: './mi-salud-modal.component.html',
  styleUrl: './mi-salud-modal.component.css',
})
export class MiSaludModalComponent {
  /**
   * Tipos que el trabajador puede elegir (ss_descanso_tipo con disponible_mi_salud); llegan
   * con el resumen para no hacer otra petición. Se muestran con su nombre corto
   * ("Accidente" / "Enfermedad") pero se guardan con el largo, que resuelve el backend por id.
   */
  @Input() tipos: DescansoTipoDto[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<void>();

  saving = false;

  fechaInicio = new Date().toISOString().slice(0, 10);
  fechaFin    = new Date().toISOString().slice(0, 10);
  tipoId      : number | null = null;
  diagnostico = '';
  documentos  : File[] = [];

  get diasCalculados(): number {
    const ini = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);
    const diff = Math.round((fin.getTime() - ini.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  }

  constructor(
    private svc         : MiSaludService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr         : ChangeDetectorRef,
  ) {}

  // La app corre zoneless: tras cambiar estado desde un evento hay que pedir el repintado.
  onFechaInicioChange(v: string | null): void {
    this.fechaInicio = v ?? '';
    // Si la fecha fin quedó antes del nuevo inicio, se arrastra para no dejar un rango inválido.
    if (this.fechaFin && this.fechaInicio && this.fechaFin < this.fechaInicio) this.fechaFin = this.fechaInicio;
    this.cdr.detectChanges();
  }

  onFechaFinChange(v: string | null): void {
    this.fechaFin = v ?? '';
    this.cdr.detectChanges();
  }

  onDocumentosChange(archivos: File[]): void {
    this.documentos = archivos;
    this.cdr.detectChanges();
  }

  guardar(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Ingresa las fechas del descanso.' });
      return;
    }
    if (new Date(this.fechaFin) < new Date(this.fechaInicio)) {
      Swal.fire({ icon: 'warning', title: 'Fechas inválidas', text: 'La fecha fin no puede ser anterior a la fecha inicio.' });
      return;
    }
    if (!this.tipoId) {
      Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Selecciona el tipo de descanso.' });
      return;
    }

    this.saving = true;
    this.loaderService.show();

    this.svc.createDescanso({
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      dias: this.diasCalculados,
      tipoId: this.tipoId,
      diagnostico: this.diagnostico || null,
    }, this.documentos).subscribe({
      next: (res) => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Descanso registrado', text: res.message, timer: 2500, showConfirmButton: false });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }
}
