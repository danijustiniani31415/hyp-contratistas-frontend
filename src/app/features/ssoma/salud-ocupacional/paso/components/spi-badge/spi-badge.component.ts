import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spi-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spi-badge.component.html',
  styleUrl: './spi-badge.component.css',
})
export class SpiBadgeComponent {
  @Input() spi: number | null | undefined = null;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  /** Si se provee, spi=0 con planificadas=0 se trata como "Sin datos" en lugar de "Crítico" */
  @Input() planificadas: number | null | undefined;

  get nivel(): 'success' | 'warning' | 'danger' | 'none' {
    if (this.spi == null) return 'none';
    // spi=0 sin actividades planificadas → no hay datos reales, no mostrar "Crítico"
    if (this.spi === 0 && this.planificadas != null && this.planificadas === 0) return 'none';
    if (this.spi >= 0.95) return 'success';
    if (this.spi >= 0.80) return 'warning';
    return 'danger';
  }

  get label(): string {
    switch (this.nivel) {
      case 'success': return 'En plazo';
      case 'warning': return 'En riesgo';
      case 'danger':  return 'Crítico';
      default:        return 'Sin datos';
    }
  }

  get badgeClass(): string {
    switch (this.nivel) {
      case 'success': return 'bg-green-100 text-green-800 border border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'danger':  return 'bg-red-100 text-red-800 border border-red-200';
      default:        return 'bg-gray-100 text-gray-500 border border-gray-200';
    }
  }

  get iconClass(): string {
    switch (this.nivel) {
      case 'success': return 'ti ti-circle-check text-green-600';
      case 'warning': return 'ti ti-alert-triangle text-yellow-600';
      case 'danger':  return 'ti ti-circle-x text-red-600';
      default:        return 'ti ti-minus text-gray-400';
    }
  }

  get formatted(): string {
    if (this.nivel === 'none') return '—';
    return this.spi != null ? this.spi.toFixed(2) : '—';
  }
}
