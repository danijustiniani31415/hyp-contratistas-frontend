import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';

/**
 * Adjuntos (certificados médicos) de un descanso: zona de arrastre + lista de archivos elegidos.
 * Lo usan los dos formularios de descanso — el de Mi Salud (lo llena el trabajador) y el de
 * Descansos de Salud Ocupacional (lo llena SSOMA) — para que subir n archivos se vea y se
 * comporte igual en ambos. El acento se pasa por `color` para que combine con el formulario.
 */
@Component({
  selector: 'app-descanso-adjuntos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FileSelector],
  templateUrl: './descanso-adjuntos.html',
  styleUrl: './descanso-adjuntos.css',
})
export class DescansoAdjuntos {
  /** Archivos seleccionados. El padre es dueño del arreglo (se puede usar con [(archivos)]). */
  @Input() archivos: File[] = [];
  @Output() archivosChange = new EventEmitter<File[]>();

  @Input() label = 'Certificado médico';
  /** Color de acento del recuadro de subida. Por defecto el azul de los formularios SSOMA. */
  @Input() color = 'var(--color-abril-logo-blue)';

  /**
   * Fondo del recuadro de subida y de los chips: el mismo `color` del acento rebajado a un tinte
   * casi blanco. Se deriva en vez de fijarse porque el fondo por defecto de `file-selector` es el
   * verde claro histórico (#f7fbf3), y con el borde y el ícono en azul la caja quedaba verde por
   * dentro y azul por fuera. Derivarlo del acento hace que combine con cualquier color que le
   * pase el formulario, no solo con el azul.
   */
  get fondo(): string {
    return `color-mix(in srgb, ${this.color} 7%, #ffffff)`;
  }

  onFileSelected(sf: SelectedFile): void {
    this.archivosChange.emit([...this.archivos, sf.file]);
  }

  quitar(index: number): void {
    this.archivosChange.emit(this.archivos.filter((_, i) => i !== index));
  }
}
