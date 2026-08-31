import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Botón "Filtros" con badge de cantidad activa. Pensado para proyectarse en
 * el slot `tabsExtra` de app-abril-page-header (a la altura de las pestañas,
 * sin robar una fila completa) y abrir un <app-filter-modal>.
 *
 * Uso:
 *   <app-filter-trigger tabsExtra [count]="filtrosActivos" (open)="abrirFiltros()" />
 */
@Component({
  selector: 'app-filter-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" (click)="open.emit()"
      class="filter-trigger-btn relative flex items-center gap-[6px] px-[12px] py-[7px] rounded-[7px] border text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
      style="border-color:var(--color-abril-border)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M7 12h10M10 18h4"/>
      </svg>
      <span class="btn-label">Filtros</span>
      <span *ngIf="count > 0"
        class="inline-flex items-center justify-center min-w-[16px] h-[16px] px-[4px] rounded-full text-[10px] font-semibold text-white"
        style="background:var(--color-abril-standard)">{{ count }}</span>
    </button>
  `,
  styles: [`
    /* Foco visible por teclado (Tab), no al hacer clic con mouse. Usa el
       mismo teal que ya usa el badge de conteo, para no introducir un
       acento nuevo en un componente compartido por toda la app. */
    .filter-trigger-btn:focus-visible {
      outline: 2px solid var(--color-abril-standard);
      outline-offset: 2px;
    }
  `],
})
export class FilterTriggerButton {
  @Input() count = 0;
  @Output() open = new EventEmitter<void>();
}
