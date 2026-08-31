import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { VecinoLicenciaTipoDTO } from '../../dtos/control-licencias.dto';

export interface TipoUpsertResult {
  descripcion: string;
  diasAntesDefault: number | null;
}

@Component({
  selector: 'app-tipo-upsert',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel],
  templateUrl: './tipo-upsert.html',
})
export class TipoUpsert implements OnInit {
  /** null = alta; con valor = edición. */
  @Input() tipo: VecinoLicenciaTipoDTO | null = null;
  /** Título del modal (varía según catálogo base vs tipo propio del proyecto). */
  @Input() titulo = 'Nuevo tipo de licencia';
  @Output() closeModal = new EventEmitter<void>();
  @Output() save = new EventEmitter<TipoUpsertResult>();

  descripcion = '';
  diasAntesDefault: number | null = null;

  ngOnInit(): void {
    this.descripcion = this.tipo?.descripcion ?? '';
    this.diasAntesDefault = this.tipo?.diasAntesDefault ?? null;
  }

  close(): void {
    this.closeModal.emit();
  }

  guardar(): void {
    if (!this.descripcion.trim()) {
      Swal.fire({ icon: 'warning', title: 'Ingresa una descripción', confirmButtonColor: '#0F6E56' });
      return;
    }
    if (this.diasAntesDefault !== null && this.diasAntesDefault < 0) {
      Swal.fire({ icon: 'warning', title: 'Los días de antelación no pueden ser negativos', confirmButtonColor: '#0F6E56' });
      return;
    }

    this.save.emit({ descripcion: this.descripcion.trim(), diasAntesDefault: this.diasAntesDefault });
  }
}
