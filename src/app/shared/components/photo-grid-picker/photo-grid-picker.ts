import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-photo-grid-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-grid-picker.html',
  styleUrl: './photo-grid-picker.css',
})
export class PhotoGridPicker {
  @Input() previews: string[] = [];
  @Input() max = 10;
  @Input() accept = 'image/*';
  // Sin `capture` el móvil muestra el menú nativo (Cámara / Galería / Archivos)
  // en vez de abrir la cámara directamente. Un consumidor que quiera forzar
  // foto en vivo puede pasar [capture]="'environment'" explícitamente.
  @Input() capture: string | null = null;
  @Input() multiple = true;
  @Input() addLabel = 'Agregar foto';
  @Input() addIcon = 'ti-camera-plus';
  @Input() color = 'var(--color-abril-standard)';
  // Botón aparte con `capture` + sin `multiple`: en móviles (sobre todo iOS Safari) un
  // input con `multiple` oculta la opción "Cámara" del menú nativo y solo deja Galería/
  // Archivos, porque no se puede tomar varias fotos en una sola sesión de cámara. Este
  // segundo input garantiza que la cámara siempre esté disponible como acción explícita.
  @Input() showCameraButton = true;

  @Output() filesSelected = new EventEmitter<FileList>();
  @Output() remove = new EventEmitter<number>();

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.filesSelected.emit(input.files);
    }
    input.value = '';
  }

  removeAt(index: number): void {
    this.remove.emit(index);
  }
}
