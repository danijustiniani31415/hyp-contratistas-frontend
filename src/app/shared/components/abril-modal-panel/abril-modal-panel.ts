import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Modal estándar (2026) para formularios de creación/edición SSOMA y afines:
 * fondo gris + panel centrado redondeado + header de color con ícono + footer
 * fijo. Único origen de verdad — no reimplementar este shell por página (era
 * el bug: Amonestaciones, y antes RAC/OPT/Inspección como página completa,
 * cada uno con su propio overlay/header/footer).
 *
 * Dos variantes de color: 'teal' (--color-abril-standard, el acento general
 * de la app — Gestión Administrativa/Salidas) y 'blue' (--color-abril-logo-blue,
 * el azul del logo — SSOMA). No inventar un tercer color sin agregarlo acá.
 *
 * El body es scrollable y `<ng-content>` recibe el contenido (incluye el
 * stepper de pasos si el formulario es multi-paso — el shell no impone
 * estructura interna, solo el contenedor). El footer se proyecta aparte con
 * `<ng-content select="[modalFooter]">` porque cada formulario tiene botones
 * distintos (Cancelar/Guardar vs Anterior/Siguiente).
 */
@Component({
  selector: 'app-abril-modal-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './abril-modal-panel.html',
  styleUrl: './abril-modal-panel.css',
})
export class AbrilModalPanel {
  @Input() titulo = '';
  /** Subtítulo opcional bajo el título, dentro del header de color (p.ej. código · detalle). */
  @Input() subtitulo = '';
  @Input() icono = 'ti-edit';
  @Input() variant: 'teal' | 'blue' = 'teal';
  @Input() width = '620px';
  /**
   * Si es true, una vez que el usuario MODIFICA el modal (llena un campo, elige una opción de un
   * desplegable, suelta un archivo, etc.) el modal ya NO se cierra al hacer clic fuera: solo se
   * cierra con la X o con su botón de cerrar. Esto evita perder por accidente la información en
   * proceso. Mientras el modal siga igual que cuando se abrió, el clic fuera lo cierra normalmente.
   * Mismo comportamiento (y mismo nombre de input) que `app-base-modal`.
   */
  @Input() preventCloseWhenDirty = false;
  @Output() closeModal = new EventEmitter<void>();

  /** El contenido del modal fue modificado respecto a su estado inicial. */
  dirty = false;

  /** true si el mousedown empezó en el backdrop (y no arrastrando texto desde dentro del panel). */
  private mousedownOnBackdrop = false;

  /**
   * Marca el modal como modificado. Lo disparan los eventos que burbujean desde el contenido
   * proyectado: `input`/`change` nativos y el evento `modalfieldchange` que emiten los componentes
   * custom (search-select, file-selector, date-picker, time-picker) al cambiar su valor.
   */
  markDirty(): void {
    if (this.preventCloseWhenDirty) this.dirty = true;
  }

  onBackdropMousedown(): void {
    this.mousedownOnBackdrop = true;
  }

  onBackdropClick(): void {
    const empezoEnBackdrop = this.mousedownOnBackdrop;
    this.mousedownOnBackdrop = false;
    if (!empezoEnBackdrop) return;
    // Con el bloqueo activo y el modal ya modificado, el clic fuera se ignora.
    if (this.preventCloseWhenDirty && this.dirty) return;
    this.closeModal.emit();
  }
}
