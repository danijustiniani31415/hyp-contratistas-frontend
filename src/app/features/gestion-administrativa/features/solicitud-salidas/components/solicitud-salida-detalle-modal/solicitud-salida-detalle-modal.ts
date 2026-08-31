import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { DraggableImage } from '../../../../../../shared/components/draggable-image/draggable-image';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SolicitudSalidasService } from '../../services/solicitud-salidas.service';
import {
  SolicitudSalidaDetalleDto,
  TrayectoDetalleDto,
} from '../../dtos/solicitud-salida-detalle.dto';

@Component({
  standalone: true,
  selector: 'app-solicitud-salida-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, DraggableImage],
  templateUrl: './solicitud-salida-detalle-modal.html',
})
export class SolicitudSalidaDetalleModal implements OnInit {
  @Input({ required: true }) solicitudId!: number;
  @Output() close = new EventEmitter<void>();

  detalle: SolicitudSalidaDetalleDto | null = null;

  get totalGeneral(): number {
    if (!this.detalle) return 0;
    return this.detalle.trayectos.reduce((acc, t) => acc + (t.montoTotal || 0), 0);
  }

  totalCapturas(t: TrayectoDetalleDto): number {
    return t.capturas.reduce((acc, c) => acc + (c.monto || 0), 0);
  }

  ngOnInit(): void {
    this.cargar();
  }

  constructor(
    private service: SolicitudSalidasService,
    private loader: LoaderService,
    private errorService: ErrorService,
  ) {}

  cerrar(): void {
    this.close.emit();
  }

  cargar(): void {
    this.loader.show();
    this.service.getDetalle(this.solicitudId).subscribe({
      next: (data) => {
        this.detalle = data;
        this.loader.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.close.emit();
      },
    });
  }

  aprobacionColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      default:          return { bg: '#FEF9C3', text: '#92400E' };
    }
  }

  rendicionColors(estado: string): { bg: string; text: string } {
    return estado === 'Rendido'
      ? { bg: '#DBEAFE', text: '#0086A5' }
      : { bg: '#F3F4F6', text: '#6B7280' };
  }
}
