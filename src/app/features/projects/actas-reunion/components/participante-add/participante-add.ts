import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { TrabajadorAbrilDTO } from '../../dtos/actas-reunion.dto';

/** Participante elegido en el modal, listo para agregarse a la tabla del acta. */
export interface ParticipanteSeleccionado {
  workerId: number | null;
  nombre: string;
  cargo: string;
  iniciales: string;
}

/**
 * Modal para agregar un participante a la reunión eligiéndolo del desplegable de
 * trabajadores de Abril (workers con correo @abril.pe). El cargo se autocompleta con
 * el puesto del trabajador; si no tiene, el texto
 * ingresado a mano se guarda luego en workers.puesto al guardar el acta.
 */
@Component({
  selector: 'app-participante-add',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './participante-add.html',
})
export class ParticipanteAdd {
  @Input() trabajadores: TrabajadorAbrilDTO[] = [];
  /** Iniciales ya usadas en la reunión, para evitar duplicados (ej. "MC" → "MC 2"). */
  @Input() inicialesExistentes: string[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() add = new EventEmitter<ParticipanteSeleccionado>();

  workerId: number | null = null;
  /** Participante externo (proveedor, invitado, etc.) que no está en la lista de trabajadores. */
  externo = false;
  nombreExterno = '';
  cargo = '';
  iniciales = '';
  private inicialesEditadas = false;
  /** True cuando el trabajador elegido no tiene puesto registrado. */
  cargoManual = false;

  get trabajadorSeleccionado(): TrabajadorAbrilDTO | null {
    return this.trabajadores.find((t) => t.workerId === this.workerId) ?? null;
  }

  onTrabajadorChange(workerId: number | null): void {
    this.workerId = workerId;
    const t = this.trabajadorSeleccionado;
    this.cargo = t?.cargo ?? '';
    this.cargoManual = !!t && !t.cargo;
    if (!this.inicialesEditadas) this.iniciales = this.generarIniciales(t?.fullName ?? '');
  }

  onExternoChange(): void {
    this.workerId = null;
    this.nombreExterno = '';
    this.cargo = '';
    this.cargoManual = false;
    if (!this.inicialesEditadas) this.iniciales = '';
  }

  onNombreExternoChange(): void {
    if (!this.inicialesEditadas) this.iniciales = this.generarIniciales(this.nombreExterno);
  }

  onInicialesChange(): void {
    this.inicialesEditadas = true;
  }

  private generarIniciales(nombre: string): string {
    const base = nombre
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
    if (!base) return '';
    const repetidas = this.inicialesExistentes.filter(
      (i) => i === base || i.startsWith(base + ' '),
    ).length;
    return repetidas > 0 ? `${base} ${repetidas + 1}` : base;
  }

  submit(): void {
    const nombre = this.externo
      ? this.nombreExterno.trim()
      : (this.trabajadorSeleccionado?.fullName ?? '');
    if (!nombre) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: this.externo
          ? 'Ingresa el nombre del participante externo.'
          : 'Selecciona un trabajador.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    this.add.emit({
      workerId: this.externo ? null : this.workerId,
      nombre,
      cargo: this.cargo.trim(),
      iniciales: this.iniciales.trim(),
    });
  }
}
