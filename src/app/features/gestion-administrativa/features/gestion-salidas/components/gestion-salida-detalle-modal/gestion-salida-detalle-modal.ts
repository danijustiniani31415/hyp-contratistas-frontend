import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { DraggableImage } from '../../../../../../shared/components/draggable-image/draggable-image';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import {
  GestionSalidaDetalleDto,
  GestionSalidaTrayectoDto,
} from '../../dtos/gestion-salida.dto';

@Component({
  standalone: true,
  selector: 'app-gestion-salida-detalle-modal',
  imports: [CommonModule, BaseModal, StatusBadge, DraggableImage, TitleCasePipe],
  templateUrl: './gestion-salida-detalle-modal.html',
})
export class GestionSalidaDetalleModal {
  @Input({ required: true }) detalle!: GestionSalidaDetalleDto;
  @Output() close = new EventEmitter<void>();

  get totalGeneral(): number {
    return this.detalle.trayectos.reduce((acc, t) => acc + (t.montoTotal || 0), 0);
  }

  totalCapturas(t: GestionSalidaTrayectoDto): number {
    return t.capturas.reduce((acc, c) => acc + (c.monto || 0), 0);
  }

  cerrar(): void {
    this.close.emit();
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

  reembolsoColors(estado: string): { bg: string; text: string } {
    switch (estado) {
      case 'Aprobado':  return { bg: '#D7FAF4', text: '#009C87' };
      case 'Rechazado': return { bg: '#FAD5D4', text: '#D30000' };
      case 'Firmado':   return { bg: '#E0E7FF', text: '#4338CA' };
      case 'Pagado':    return { bg: '#DCFCE7', text: '#15803D' };
      default:          return { bg: '#FEF9C3', text: '#92400E' }; // Pendiente
    }
  }
}
