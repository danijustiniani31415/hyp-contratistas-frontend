import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FilePreviewItem {
  name: string;
  size: string;
}

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-preview.html',
})
export class FilePreview {

  @Input() files: FilePreviewItem[] = [];

  /**
   * Opcional. Color del borde de la tarjeta. Mismo criterio que `app-file-selector`: el verde lima
   * estaba fijo, así que en un formulario con acento de otro color (ej. el azul del logo en
   * GTH/SSOMA) el área de arrastre se veía azul y, al adjuntar el archivo, la tarjeta aparecía
   * verde. Por defecto el verde histórico, así que los consumidores que no pasan nada se ven
   * exactamente igual que antes.
   */
  @Input() color = 'var(--color-abril-lime)';

  /** Opcional. Fondo de la tarjeta. null = blanco (el histórico). */
  @Input() background: string | null = null;

  /** Opcional. Color del ícono del archivo. null = el rojo histórico. */
  @Input() iconColor: string | null = null;

  @Output() remove = new EventEmitter<number>();

  removeFile(index: number) {
    this.remove.emit(index);
  }

}
