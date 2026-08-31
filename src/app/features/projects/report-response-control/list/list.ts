import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResidentReportIncidenceDTO } from '../../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { AuthService } from '../../../../core/services/auth.service';
import { Roles } from '../../../../core/constants/roles';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { ElapsedInfo, tiempoTranscurrido } from '../shared/elapsed-time';

/**
 * Vista tabla (presentacional) del control de respuesta de informes. No hace HTTP:
 * recibe los datos ya paginados del padre y emite las acciones de fila
 * (ver detalle / responder), que el padre resuelve abriendo el modal correspondiente.
 *
 * A propósito NO replica el tratamiento de color de las tarjetas: la tabla es para
 * escaneo rápido, así que el tiempo transcurrido va como texto secundario neutro y
 * solo se tiñe de rojo en el caso crítico (NO LEVANTADO con más de 30 días).
 */
@Component({
  selector: 'app-list',
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class List implements OnChanges {
  readonly Roles = Roles;

  @Input() data: ResidentReportIncidenceDTO[] = [];
  @Input() loading = false;

  @Output() respond = new EventEmitter<ResidentReportIncidenceDTO>();
  @Output() openView = new EventEmitter<ResidentReportIncidenceDTO>();

  /** Filas fantasma para el skeleton de carga inicial (F8). */
  readonly skeletonRows = Array.from({ length: 6 });

  /** Memo por incidencia: evita recalcular fechas en cada ciclo de detección de cambios. */
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
