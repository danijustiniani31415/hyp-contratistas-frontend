import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DescansosService } from '../../../features/ssoma/salud-ocupacional/descansos/descansos.service';
import { Cie10Dto } from '../../../features/ssoma/salud-ocupacional/descansos/descansos.dtos';

/**
 * Selector de diagnóstico CIE-10 con búsqueda server-side (el catálogo oficial tiene miles de
 * códigos, no se puede traer completo al frontend como hace app-search-select con catálogos
 * chicos). Solo lo usa el médico al revisar un descanso/seguimiento — el trabajador que sube el
 * descanso nunca ve este campo.
 */
@Component({
  selector: 'app-cie10-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cie10-select.html',
  styleUrl: './cie10-select.css',
})
export class Cie10Select implements OnChanges {
  /** Código CIE-10 seleccionado (ej. "J45.9"), o null. */
  @Input() value: string | null = null;
  /** Descripción ya conocida del código seleccionado (ej. al abrir un registro existente) —
   * evita mostrar solo el código sin texto hasta que el usuario vuelva a buscar. */
  @Input() valueLabel: string | null = null;
  @Output() valueChange = new EventEmitter<string | null>();
  @Input() placeholder = 'Buscar código CIE-10...';
  @Input() allowClear = true;

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  isOpen = false;
  searchText = '';
  loading = false;
  resultados: Cie10Dto[] = [];
  private seleccionLabel: string | null = null;

  private search$ = new Subject<string>();

  constructor(
    private descansosService: DescansosService,
    private elRef: ElementRef<HTMLElement>,
  ) {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          this.loading = true;
          return this.descansosService.buscarCie10(term);
        }),
      )
      .subscribe({
        next: (res) => {
          this.resultados = res;
          this.loading = false;
        },
        error: () => {
          this.resultados = [];
          this.loading = false;
        },
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !this.value) this.seleccionLabel = null;
    if (changes['valueLabel']) this.seleccionLabel = this.valueLabel ?? this.seleccionLabel;
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent) {
    if (this.isOpen && !this.elRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  get triggerLabel(): string {
    if (!this.value) return this.placeholder;
    return this.seleccionLabel ? `${this.value} — ${this.seleccionLabel}` : this.value;
  }

  toggle(event: MouseEvent) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchText = '';
      this.resultados = [];
      setTimeout(() => this.searchInput?.nativeElement.focus());
    }
  }

  onSearchInput(): void {
    if (this.searchText.trim().length >= 2) this.search$.next(this.searchText.trim());
    else this.resultados = [];
  }

  select(item: Cie10Dto): void {
    this.value = item.codigo;
    this.seleccionLabel = item.descripcion;
    this.valueChange.emit(this.value);
    this.isOpen = false;
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();
    this.value = null;
    this.seleccionLabel = null;
    this.valueChange.emit(null);
  }

  close(): void {
    this.isOpen = false;
  }

  trackByCodigo(_index: number, item: Cie10Dto): string {
    return item.codigo;
  }
}
