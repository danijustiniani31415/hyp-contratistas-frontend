import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonListDTO } from '../../dtos/lessonList.model';
import { PeriodLabelPipe } from '../../../../../../shared/pipes/period-label.pipe';

@Component({
  selector: 'app-lesson-list',
  standalone: true,
  imports: [CommonModule, PeriodLabelPipe],
  templateUrl: './list.html',
})
export class LessonList {
  @Input() lessons: LessonListDTO[] = [];
  @Input() apiUrl = '';
  @Output() viewDetail = new EventEmitter<{ lessonId: number; tab: 'general' | 'images' }>();

  openDetail(lessonId: number, event: MouseEvent, tab: 'general' | 'images'): void {
    event.stopPropagation();
    this.viewDetail.emit({ lessonId, tab });
  }

  getOpportunityImages(images: any[]): any[] {
    return images?.filter(img => img.imageTypeDescription === 'OPORTUNIDAD') ?? [];
  }

  getImprovementImages(images: any[]): any[] {
    return images?.filter(img => img.imageTypeDescription === 'MEJORA') ?? [];
  }
}
