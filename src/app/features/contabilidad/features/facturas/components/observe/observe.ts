import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { InvoiceObservationReasonDto } from '../../dtos/invoice.dtos';

/**
 * Modal para observar en bloque las facturas seleccionadas.
 * Muestra un desplegable con los motivos del catálogo y emite el motivo elegido.
 */
@Component({
  selector: 'app-factura-observe',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './observe.html',
})
export class FacturaObserve {
  /** Motivos de observación disponibles (vienen de la carga inicial). */
  @Input() reasons: InvoiceObservationReasonDto[] = [];
  /** Cantidad de facturas seleccionadas (solo para el texto del modal). */
  @Input() count = 0;

  @Output() closeModal = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<number>();

  reasonId: number | null = null;

  save(): void {
    if (!this.reasonId) {
      Swal.fire({ icon: 'info', title: 'Selecciona un motivo', text: 'Debes elegir un motivo de observación.' });
      return;
    }
    this.confirm.emit(this.reasonId);
  }
}
