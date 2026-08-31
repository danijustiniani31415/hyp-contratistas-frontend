import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrackingItemDto } from '../../../../core/dtos/residentMonitoring/residentMonitoringDto.model';

@Component({
  selector: 'app-resident-table',
  imports: [CommonModule],
  templateUrl: './resident-table.html',
  styleUrl: './resident-table.css',
})
export class ResidentTable {
  protected Math = Math;
  @Input() data: TrackingItemDto[] = [];

  getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  getFilePillClass(uploaded: number, expected: number): string {
    if (uploaded >= expected) return 'pill-green';
    if (uploaded > 0)         return 'pill-amber';
    return 'pill-red';
  }

  getIncidencePillClass(answered: number, total: number): string {
    if (answered >= total) return 'pill-green';
    if (answered > 0)      return 'pill-amber';
    return 'pill-red';
  }

  getFilePercentage(uploaded: number, expected: number): number {
    if (expected === 0) return 0;
    return Math.round((uploaded / expected) * 100);
  }

  getTotalPillClass(percentage: number): string {
    if (percentage === 100) return 'pill-green';
    if (percentage >= 50)   return 'pill-amber';
    return 'pill-red';
  }
}