import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResidentReportIncidenceDTO } from '../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { AuthService } from '../../../../core/services/auth.service';
import { Roles } from '../../../../core/constants/roles';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { ElapsedInfo, tiempoTranscurrido, URGENCIA_RIEL } from '../shared/elapsed-time';

/**
 * Vista tarjetas (presentacional) del control de respuesta de informes. Espejo de la
 * vista tabla: mismos datos (@Input) y mismas acciones de fila (@Output). El gating de
 * rol del botón/texto de respuesta es idéntico al de la tabla.
 *
 * A diferencia de la tabla —que se mantiene neutra para escaneo rápido— acá el tiempo
 * transcurrido sí se pinta con color de urgencia (barra superior + texto).
 */
@Component({
  selector: 'app-report-cards',
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './report-cards.html',
  styleUrl: './report-cards.css',
})
export class ReportCards implements OnChanges {
  readonly Roles = Roles;
  readonly rielBarra = URGENCIA_RIEL;

  @Input() data: ResidentReportIncidenceDTO[] = [];
  @Input() loading = false;

  @Output() respond = new EventEmitter<ResidentReportIncidenceDTO>();
  @Output() openView = new EventEmitter<ResidentReportIncidenceDTO>();

  /** Tarjetas fantasma para el skeleton de carga inicial (F8). */
  readonly skeletonCards = Array.from({ length: 6 });

  /**
   * Memo del tiempo transcurrido por incidencia. La plantilla lo consulta varias veces
   * por tarjeta (barra, texto, tooltip) y en cada ciclo de detección de cambios: sin
   * este cache se recalcularían fechas en cada render. Se limpia al llegar datos nuevos.
   */
  private readonly cacheTiempo = new Map<number, ElapsedInfo>();

  constructor(public authService: AuthService) {}

  ngOnChanges(): void {
    this.cacheTiempo.clear();
  }

  tiempo(item: ResidentReportIncidenceDTO): ElapsedInfo {
    let info = this.cacheTiempo.get(item.residentReportIncidenceId);
    if (!info) {
      info = tiempoTranscurrido(item);
      this.cacheTiempo.set(item.residentReportIncidenceId, info);
    }
    return info;
  }

  onRespond(item: ResidentReportIncidenceDTO, event: MouseEvent): void {
    event.stopPropagation();
    this.respond.emit(item);
  }
}
