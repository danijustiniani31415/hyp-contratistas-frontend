import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonListDTO } from '../../dtos/lessonList.model';
import { PeriodLabelPipe } from '../../../../../../shared/pipes/period-label.pipe';

@Component({
  selector: 'app-lesson-card',
  standalone: true,
  imports: [CommonModule, PeriodLabelPipe],
  templateUrl: './card.html',
})
export class LessonCard {
  @Input() item!: LessonListDTO;
  @Input() apiUrl = '';
  @Output() cardClick = new EventEmitter<number>();

  getOpportunityImage(images: any[]): any | null {
    return images?.find(img => img.imageTypeDescription === 'OPORTUNIDAD') ?? null;
  }

  getImprovementImage(images: any[]): any | null {
    return images?.find(img => img.imageTypeDescription === 'MEJORA') ?? null;
  }

  imageUrl(url: string): string {
    return url.startsWith('http') ? url : this.apiUrl + url;
  }
}
