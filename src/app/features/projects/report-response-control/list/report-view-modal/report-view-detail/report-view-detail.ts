import { Component, Input, OnChanges } from '@angular/core';
import { ResidentReportIncidenceDTO } from '../../../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../../../core/services/auth.service';
import { Roles } from '../../../../../../core/constants/roles';
import { ResidentReportIncidenceService } from '../../../../../../core/services/residentReportIncidence.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { UpdateIncidenceDTO } from '../../../../../../core/dtos/reportResponseControl/updateIncidence.model';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { ReportViewImages } from '../report-view-images/report-view-images';
import { ElapsedInfo, tiempoTranscurrido } from '../../../shared/elapsed-time';

/**
 * Contenido completo del informe en una sola vista (ya no hay pestañas): datos de
 * cabecera, fecha + tiempo transcurrido, descripción, miniaturas de las imágenes y
 * respuesta, en ese orden de lectura.
 */
@Component({
  selector: 'app-report-view-detail',
  imports: [CommonModule, TitleCasePipe, ReportViewImages],
  templateUrl: './report-view-detail.html',
  styleUrl: './report-view-detail.css',
})
export class ReportViewDetail implements OnChanges {
  readonly Roles = Roles;
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

  /** Mismo cálculo que usan las tarjetas y la tabla (una sola fuente de verdad). */
  tiempo: ElapsedInfo = tiempoTranscurrido(this.selectedIncidence);

  updateDto: UpdateIncidenceDTO = {
    incidenceId: 0,
  };

  constructor(
    public authService: AuthService,
    private residentReportIncidenceService: ResidentReportIncidenceService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnChanges(): void {
    this.tiempo = tiempoTranscurrido(this.selectedIncidence);
  }

  updateIncidence() {
    this.loaderService.show();
    this.updateDto.incidenceId = this.selectedIncidence.residentReportIncidenceId;
    this.residentReportIncidenceService.updateIncidenceState(this.updateDto).subscribe({
      next: (response) => {
        this.loaderService.hide();
        Swal.fire({
          title: response.message ?? 'Item creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
