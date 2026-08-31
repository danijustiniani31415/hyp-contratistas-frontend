import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectedFile {
  preview: string;
  file: File;
}

@Component({
  selector: 'app-file-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-selector.html',
  styleUrl: './file-selector.css',
})
export class FileSelector {
  @Input() accept = '.png,.jpg,.jpeg';
  @Input() label = 'Arrastra archivos aquí o';
  @Input() hint = 'PNG, JPG, JPEG';
  /** Color del borde, ícono y texto destacado. Por defecto el verde claro original. */
  @Input() color = '#64BC04';
  /**
   * Opcional. Fondo del área de arrastre. Existe porque el fondo estaba fijo en un verde muy claro
   * y, en un formulario con acento de otro color (ej. el azul del logo en GTH/SSOMA), el borde y el
   * ícono quedaban de un color y el fondo de otro. null = el verde histórico, así que los ~26
   * consumidores que no pasan nada se ven exactamente igual que antes.
   */
  @Input() background: string | null = null;
  /**
   * Opcional. Fondo al pasar el cursor. null = si `background` tampoco se pasó, el verde histórico;
   * y si se pasó, un tono un poco más cargado del mismo fondo hacia el color de acento.
   */
  @Input() backgroundHover: string | null = null;

  @Output() fileSelected = new EventEmitter<SelectedFile>();

  /** Fondo en reposo. null deja actuar al valor por defecto del CSS (el verde histórico). */
  get bg(): string | null {
    return this.background;
  }

  /** Fondo al pasar el cursor (ver `backgroundHover`). */
  get bgHover(): string | null {
    if (this.backgroundHover) return this.backgroundHover;
    if (!this.background) return null;
    return `color-mix(in srgb, ${this.background} 92%, ${this.color})`;
  }

  constructor(private el: ElementRef) {}

  onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer?.files) return;
    this.handleFiles(e.dataTransfer.files);
  }

  onFilesSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    this.handleFiles(input.files);
    input.value = '';
  }

  private handleFiles(files: FileList) {
    Array.from(files).forEach((file) => {
      const preview = URL.createObjectURL(file);
      this.fileSelected.emit({ preview, file });
    });
    // Evento DOM que burbujea para que app-base-modal detecte que se soltó/eligió un archivo
    // (el drag&drop no produce un evento `change` nativo).
    this.el.nativeElement.dispatchEvent(new Event('modalfieldchange', { bubbles: true }));
  }
}
