import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { ReportViewDetail } from './report-view-detail/report-view-detail';
import { ResidentReportIncidenceDTO } from '../../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';

/**
 * Marco del modal "Ver informe". Solo compone: el contenido completo (datos, imágenes
 * y respuesta) lo arma ReportViewDetail en una sola vista con scroll — ya no hay
 * pestañas ni estado de pestaña activa que administrar acá.
 */
@Component({
  selector: 'app-report-view-modal',
  imports: [CommonModule, ReportViewDetail, BaseModal],
  templateUrl: './report-view-modal.html',
  styleUrl: './report-view-modal.css',
})
export class ReportViewModal {
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
  @Output() closeReportViewModal = new EventEmitter();
}
