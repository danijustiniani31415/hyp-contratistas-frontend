import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EvidenciaFotoDto } from '../../dtos/planeamiento-bim-carga-diaria.dto';

/**
 * Galería + upload de evidencias fotográficas de Planeamiento BIM, parametrizada
 * por `categoria` ("GENERAL" | "PROCURA") — reutilizada tal cual en Carga Diaria
 * para ambas secciones ("Evidencias Fotográficas del Día" y "Evidencia de
 * Procura"). No hace HTTP por su cuenta: el padre sigue siendo dueño de la
 * llamada a `PlaneamientoBimService` (R1/R2 intactos), este componente solo
 * presenta el estado y emite los archivos elegidos.
 */
@Component({
  selector: 'app-planeamiento-bim-evidencia-galeria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evidencia-galeria.html',
  styleUrl: './evidencia-galeria.css',
})
export class PlaneamientoBimEvidenciaGaleria {
  @Input() titulo = 'EVIDENCIAS FOTOGRÁFICAS DEL DÍA';
  @Input() subtitulo = 'Fotografías adjuntas que respaldan el cumplimiento diario';
  @Input() icono = 'ti ti-photo';
  @Input() evidencias: EvidenciaFotoDto[] = [];
  @Input() editable = false;
  @Input() loading = false;
  @Input() uploading = false;
  @Input() error: string | null = null;
  @Input() emptyTitulo = 'Sin evidencias fotográficas';
  @Input() emptySub = 'No se han subido imágenes para la fecha seleccionada.';

  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() retry = new EventEmitter<void>();

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    this.filesSelected.emit(Array.from(files));
    input.value = '';
  }
}
