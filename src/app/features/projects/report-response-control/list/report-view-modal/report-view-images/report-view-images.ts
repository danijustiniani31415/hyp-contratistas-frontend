import { Component, Input } from '@angular/core';
import { ResidentReportIncidenceDTO } from '../../../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { CommonModule } from '@angular/common';

/**
 * Miniaturas de las imágenes adjuntas (80x80) con vista ampliada superpuesta.
 * Se muestra dentro del detalle, entre la descripción y la respuesta: ver una
 * imagen en grande no saca al usuario del modal ni abre otra pestaña.
 */
@Component({
  selector: 'app-report-view-images',
  imports: [CommonModule],
  templateUrl: './report-view-images.html',
  styleUrl: './report-view-images.css',
})
export class ReportViewImages {
  @Input() selectedIncidence: ResidentReportIncidenceDTO = {
    residentReportIncidenceId: 0,
    residentReportIncidenceDescription: '',
    projectId: 0,
    projectDescription: '',
    stateId: 0,
    stateDescription: '',
    createdDateTime: '',
    images: [],
    residentReportResponseDescriptions: [],
  };

  /** Índice de la imagen ampliada; null = lightbox cerrado. */
  lightboxIndex: number | null = null;

  /** Blinda la plantilla ante un `images` ausente en la respuesta del backend. */
  get imagenes(): { imageUrl: string }[] {
    return this.selectedIncidence.images ?? [];
  }

  abrirLightbox(index: number): void {
    this.lightboxIndex = index;
  }

  cerrarLightbox(): void {
    this.lightboxIndex = null;
  }
}
