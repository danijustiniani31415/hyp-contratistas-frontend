import { Component, Input, Output, EventEmitter, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Desplegable con selección MÚLTIPLE y buscador. Misma estética que `app-search-select`,
 * pero `value` es un arreglo de valores (valueField) y `valueChange` emite el arreglo.
 * El desplegable permanece abierto al marcar/desmarcar opciones.
 */
@Component({
  selector: 'app-multi-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-search-select.html',
  styleUrl: './multi-search-select.css',
})
export class MultiSearchSelect {
  @Input() options: any[] = [];
  @Input() valueField: string = 'id';
  @Input() displayField: string = 'name';
  @Input() value: any[] = [];
  @Output() valueChange = new EventEmitter<any[]>();
  @Input() label: string = '';
  @Input() showLabel: boolean = true;
  @Input() placeholder: string = 'Selecciona';
  @Input() allowClear: boolean = true;
  @Input() compact: boolean = false;

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  isOpen = false;
  searchText = '';

  constructor(private el: ElementRef) {}

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent) {
    if (this.isOpen && !this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  /** Quita tildes/diacríticos y pasa a minúsculas para comparar (ej. "Máximo" ≈ "maximo"). */
  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  get filteredOptions(): any[] {
    if (!this.searchText.trim()) return this.options;
    const words = this.searchText.trim().split(/\s+/).map(w => this.normalize(w));
    return this.options.filter(opt => {
      const label = this.normalize(String(opt[this.displayField]));
      return words.every(w => label.includes(w));
    });
  }

  get hasValue(): boolean {
    return Array.isArray(this.value) && this.value.length > 0;
  }

  get selectedLabel(): string {
    if (!this.hasValue) return this.placeholder;
    if (this.value.length === 1) {
      const found = this.options.find((opt) => opt[this.valueField] === this.value[0]);
      return found ? String(found[this.displayField]) : '1 seleccionado';
    }
    return `${this.value.length} seleccionados`;
  }

  isSelected(option: any): boolean {
    return Array.isArray(this.value) && this.value.includes(option[this.valueField]);
  }

  toggle(event: MouseEvent) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchText = '';
      setTimeout(() => this.searchInput?.nativeElement.focus());
    }
  }

  toggleOption(option: any, event: MouseEvent) {
    event.stopPropagation();
    const v = option[this.valueField];
    const current = Array.isArray(this.value) ? [...this.value] : [];
    const idx = current.indexOf(v);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(v);
    this.value = current;
    this.valueChange.emit(current);
    // En selección múltiple el desplegable permanece abierto.
  }

  clear(event: MouseEvent) {
    event.stopPropagation();
    this.value = [];
    this.valueChange.emit([]);
    this.searchText = '';
  }

  close() {
    this.isOpen = false;
  }

  trackByOption = (_index: number, option: any): any => option[this.valueField];
}
