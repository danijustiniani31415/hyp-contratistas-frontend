import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectSubContractorDTO } from '../../dtos/projectSubContractorDto.model';

@Component({
  standalone: true,
  selector: 'app-card',
  imports: [CommonModule],
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  @Input() item!: ProjectSubContractorDTO;
  @Output() cardClick = new EventEmitter<number>();

  readonly stepDots = Array(9);

  readonly stepLabels = [
    'Por notificar',
    'Datos del contrato',
    'Preparación de documentos',
    'Por enviar al SC',
    'Llegada a Of. Central',
    'Procesos de firma',
    'Por escanear',
    'Envío a obra',
    'Completado',
  ];

  get stepLabel(): string {
    return this.stepLabels[this.item.projectSubContractorStatusId - 1] ?? this.item.projectSubContractorStatusDescription;
  }

  private readonly stepStyles: Record<number, string> = {
    1: 'bg-blue-50 text-blue-500 border-blue-200',
    2: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    3: 'bg-green-50 text-green-600 border-green-200',
    4: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    5: 'bg-orange-50 text-orange-600 border-orange-200',
    6: 'bg-purple-50 text-purple-600 border-purple-200',
    7: 'bg-pink-50 text-pink-600 border-pink-200',
    8: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    9: 'bg-teal-50 text-teal-700 border-teal-200',
  };

  stepBadgeClass(): string {
    return this.stepStyles[this.item.projectSubContractorStatusId] ?? 'bg-gray-100 text-gray-500 border-gray-200';
  }

  /**
   * Oficina responsable de avanzar DESDE cada paso (para colorear el mini stepper):
   * naranja = Oficina Técnica, verde = Oficina Central. El último paso es terminal.
   */
  private readonly stepOfficeMap: Record<number, 'central' | 'tecnica'> = {
    1: 'central', 2: 'central', 3: 'central', 4: 'tecnica',
    5: 'central', 6: 'central', 7: 'central', 8: 'central',
  };

  /** Color del paso según la oficina responsable: verde = Of. Central, naranja = Of. Técnica. */
  stepColor(step: number): string {
    const office = step >= this.stepDots.length ? 'done' : this.stepOfficeMap[step] ?? 'central';
    switch (office) {
      case 'tecnica':
        return '#F59E0B';
      case 'central':
        return 'var(--color-abril-primary)';
      default:
        return '#9CA3AF';
    }
  }
}
