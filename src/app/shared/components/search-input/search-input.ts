import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Input de búsqueda estilizado con ícono de lupa.
 * Emite el texto escrito vía `valueChange`.
 *
 * Búsqueda por palabras en desorden: usa `SearchInput.matches(label, query)`
 * para filtrar listas del lado del consumidor (misma lógica que app-search-select).
 */
@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule, NgIf],
  template: `
    <div
      class="flex items-center gap-[8px] bg-white h-[34px] rounded-[7px] px-[10px] text-gray-400 border
             border-[#e2e8f0] focus-within:border-[var(--color-abril-standard)] focus-within:ring-1 focus-within:ring-[var(--color-abril-standard)]/30 transition-colors"
      [style.width]="width"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="flex-shrink-0">
        <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
      </svg>
      <input
        type="text"
        [placeholder]="placeholder"
        [(ngModel)]="value"
        (ngModelChange)="valueChange.emit($event)"
        class="flex-1 border-0 outline-none bg-transparent text-gray-800 text-[12px] font-medium min-w-0 placeholder:text-gray-500 placeholder:font-normal"
      />
      <button
        *ngIf="value"
        (click)="clear()"
        class="flex-shrink-0 flex items-center justify-center w-[18px] h-[18px] rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
        type="button"
        aria-label="Limpiar"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `,
})
export class SearchInput {
  @Input() placeholder: string = 'Buscar...';
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();
  /** Ancho CSS del contenedor (ej. '280px', '100%'). Por defecto 280px. */
  @Input() width: string = '280px';

  clear(): void {
    this.value = '';
    this.valueChange.emit('');
  }

  /**
   * Devuelve true si `label` contiene todas las palabras de `query` (en cualquier orden).
   * Ignora tildes y mayúsculas.
   *
   * Uso: `SearchInput.matches(item.fullName, this.searchText)`
   */
  static matches(label: string, query: string): boolean {
    if (!query.trim()) return true;
    const normalize = (t: string) =>
      t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const words = query.trim().split(/\s+/).map(normalize);
    const target = normalize(label);
    return words.every(w => target.includes(w));
  }
}
