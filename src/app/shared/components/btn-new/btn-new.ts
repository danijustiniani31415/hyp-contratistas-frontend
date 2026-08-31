import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Botón primario de acción "Nuevo / Crear".
 * Diseño: fondo verde claro, borde verde, icono + símbolo.
 *
 * Uso:
 *   <app-btn-new label="Nueva adjudicación" (clicked)="openModal()" />
 */
@Component({
  standalone: true,
  selector: 'app-btn-new',
  template: `
    <button
      type="button"
      (click)="clicked.emit()"
      class="bg-[#E5F7D1] py-[5px] px-[18px] rounded-lg border border-[#64BC04]
             text-[#64BC04] text-sm flex items-center gap-2 cursor-pointer
             hover:bg-[#d4f0b8] transition-colors">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 0C4.486 0 0 4.486 0 10s4.486 10 10 10 10-4.486 10-10S15.514 0 10 0Zm0
             1.538c4.682 0 8.462 3.78 8.462 8.462S14.682 18.462 10 18.462 1.538 14.682
             1.538 10 5.318 1.538 10 1.538ZM9.231 5.385v3.846H5.385v1.538h3.846v3.846h1.538
             v-3.846h3.846V9.231h-3.846V5.385H9.231Z"
          fill="#64BC04" />
      </svg>
      {{ label }}
    </button>
  `,
})
export class BtnNew {
  @Input() label = 'Nuevo';
  @Output() clicked = new EventEmitter<void>();
}
