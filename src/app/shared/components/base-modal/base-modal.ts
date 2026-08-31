import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-base-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './base-modal.html',
  styleUrl: './base-modal.css',
})
export class BaseModal {
  private mousedownOnBackdrop = false;
  @Input() title: string = '';
  @Input() width: string = 'w-[1000px]';
  @Input() height: string = '';
  /**
   * Si es true, una vez que el usuario MODIFICA el modal (llena un campo, elige una opción de un
   * desplegable, suelta un archivo, etc.) el modal ya NO se cierra al hacer clic fuera: solo se
   * cierra con la X. Esto evita perder por accidente la información en proceso. Mientras el modal
   * siga igual que cuando se abrió, el clic fuera lo cierra normalmente.
   */
  @Input() preventCloseWhenDirty: boolean = false;
  /** Si es true, ocupa toda la pantalla (sin backdrop ni tarjeta centrada) — para accesos rápidos móviles. */
  @Input() fullScreen: boolean = false;
  /**
   * Color de la X de cierre. El título ya usa --color-abril-standard, pero la X quedó
   * en el verde lima histórico, así que en una pantalla con acento verde oscuro era el
   * único punto lima del modal. El default es ese mismo lima para que los ~130 modales
   * que no pasan nada se vean exactamente igual que antes.
   */
  @Input() closeColor: string = '#64BC04';
  @Output() closeModal = new EventEmitter();

  /** El contenido del modal fue modificado respecto a su estado inicial. */
  dirty = false;

  /**
   * Marca el modal como modificado. Lo disparan los eventos que burbujean desde el contenido
   * proyectado: `input`/`change` nativos y el evento `modalfieldchange` que emiten los componentes
   * custom (search-select, file-selector) al cambiar su valor.
   */
  markDirty() {
    if (this.preventCloseWhenDirty) this.dirty = true;
  }

  onBackdropMousedown() {
    this.mousedownOnBackdrop = true;
  }

  onBackdropClick() {
    const startedOnBackdrop = this.mousedownOnBackdrop;
    this.mousedownOnBackdrop = false;
    if (!startedOnBackdrop) return;
    // Si está activado el bloqueo y el modal ya se modificó, ignorar el clic fuera.
    if (this.preventCloseWhenDirty && this.dirty) return;
    this.closeModal.emit();
  }

  close() {
    this.closeModal.emit();
  }
}
