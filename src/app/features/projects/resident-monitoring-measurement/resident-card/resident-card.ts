import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrackingItemDto } from '../../../../core/dtos/residentMonitoring/residentMonitoringDto.model';

@Component({
  selector: 'app-resident-card',
  imports: [CommonModule],
  templateUrl: './resident-card.html',
  styleUrl: './resident-card.css',
})
export class ResidentCard {
  @Input() data!: TrackingItemDto;

  get initials(): string {
    return this.data.residentFullName
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  get pillClass(): string {
    if (this.data.compliancePercentage === 100) return 'pill-green';
    if (this.data.compliancePercentage >= 50)  return 'pill-amber';
    return 'pill-red';
  }

  get barClass(): string {
    if (this.data.compliancePercentage === 100) return 'bar-fill-green';
    if (this.data.compliancePercentage >= 50)  return 'bar-fill-amber';
    return 'bar-fill-red';
  }
}