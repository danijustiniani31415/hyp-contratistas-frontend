import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Panel de filtros estándar: flota como overlay sobre el borde derecho de la
 * pantalla, con un backdrop oscurecido detrás (no empuja el layout — eso
 * generaba un hueco vacío en páginas cuyo contenido no estira al 100% del
 * ancho disponible, ej. tablas angostas). Los combos de filtro se proyectan
 * como contenido (ng-content), cada uno auto-buscando al cambiar (patrón
 * (valueChange)="filters.x = $event; onSearch()").
 *
 * El cierre (X, "Listo" o clic fuera) anima la salida antes de emitir
 * closeModal, para que el consumidor pueda hacer *ngIf="filtrosAbiertos" sin
 * que el panel desaparezca de golpe.
 *
 * Uso:
 *   <app-filter-modal *ngIf="filtrosAbiertos" (closeModal)="filtrosAbiertos = false" (clear)="limpiarFiltros()">
 *     <app-search-select ...></app-search-select>
 *     ...
 *   </app-filter-modal>
 */
@Component({
  selector: 'app-filter-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 z-[105] transition-opacity duration-300 ease-out"
      [class.pointer-events-none]="!open"
      [class.opacity-0]="!open"
      (click)="closeAnimated()"
      style="background: rgba(13, 27, 42, 0.35);"
    ></div>
    <div
      class="fixed top-0 right-0 h-screen w-[320px] max-w-[90vw] z-[110] flex flex-col transition-transform duration-300 ease-out"
      [class.translate-x-0]="open"
      [class.translate-x-full]="!open"
      style="background: var(--color-abril-surface); box-shadow: -8px 0 24px -4px rgba(13, 27, 42, 0.12), -2px 0 8px -2px rgba(13, 27, 42, 0.06);"
    >
      <div class="flex items-center gap-[10px] px-[20px] py-[17px] shrink-0"
        style="border-bottom: 1px solid var(--color-abril-border);">
        <div class="flex items-center justify-center w-[28px] h-[28px] rounded-[7px] shrink-0"
          style="background: var(--color-abril-standard-light); color: var(--color-abril-standard);">
          <i class="ti ti-filter text-[15px]"></i>
        </div>
        <h3 class="text-[14px] font-semibold flex-1" style="color: var(--color-abril-ink);">Filtros</h3>
        <button type="button" (click)="closeAnimated()" aria-label="Cerrar"
          class="fm-btn flex items-center justify-center w-[26px] h-[26px] rounded-[6px] cursor-pointer transition-colors"
          style="color: var(--color-abril-placeholder);"
          onmouseover="this.style.background='var(--color-abril-bg-alt)'; this.style.color='var(--color-abril-muted)'"
          onmouseout="this.style.background=''; this.style.color='var(--color-abril-placeholder)'">
          <i class="ti ti-x text-[16px]"></i>
        </button>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto px-[20px] py-[20px] flex flex-col gap-[16px]">
        <ng-content></ng-content>
      </div>

      <div class="flex items-center justify-between px-[20px] py-[14px] shrink-0"
        style="border-top: 1px solid var(--color-abril-border); background: var(--color-abril-bg-alt);">
        <button type="button" (click)="clear.emit()"
          class="fm-btn text-[12px] font-medium cursor-pointer transition-colors"
          style="color: var(--color-abril-muted);">
          Limpiar filtros
        </button>
        <button type="button" (click)="closeAnimated()"
          class="fm-btn h-[32px] px-[18px] rounded-[7px] text-white text-[12px] font-semibold cursor-pointer transition-colors"
          style="background: var(--color-abril-standard);"
          onmouseover="this.style.background='var(--color-abril-standard-hover)'"
          onmouseout="this.style.background='var(--color-abril-standard)'">
          Listo
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* Foco visible por teclado (Tab), no al hacer clic con mouse. Mismo teal
       que ya usa el botón "Listo" y el ícono del panel — sin acento nuevo. */
    .fm-btn:focus-visible {
      outline: 2px solid var(--color-abril-standard);
      outline-offset: 2px;
    }
  `],
})
export class FilterModal {
  @Output() closeModal = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  // Abre sincrónico (sin animación de entrada) para no depender de un segundo
  // ciclo de detección de cambios: es más importante que el panel aparezca
  // siempre a que se deslice bonito.
  open = true;

  closeAnimated() {
    if (!this.open) return;
    this.open = false;
    setTimeout(() => this.closeModal.emit(), 300);
  }
}
