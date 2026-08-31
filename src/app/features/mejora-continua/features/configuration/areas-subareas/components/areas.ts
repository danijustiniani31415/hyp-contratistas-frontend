import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LessonAreaService } from '../../lesson-areas/services/lesson-area.service';
import { LessonAreaConfigItemDto } from '../../lesson-areas/dtos/lesson-area.dto';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { PsssScopeEdit } from './psss-scope-edit/psss-scope-edit';

@Component({
  selector: 'app-areas',
  standalone: true,
  imports: [CommonModule, FormsModule, PsssScopeEdit],
  templateUrl: './areas.html',
  styleUrl: './areas.css',
})
export class Areas implements OnInit {
  rows: LessonAreaConfigItemDto[] = [];
  searchText = '';

  scopeLessonAreaId?: number;
  scopeEntityName = '';
  showScopeModal = false;

  constructor(
    private lessonAreaService: LessonAreaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.lessonAreaService.getAll().subscribe({
      next: (data) => {
        // Solo ramas habilitadas en lesson_area (active = true)
        this.rows = data.filter((r) => r.active && r.lessonAreaId != null);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get filteredRows(): LessonAreaConfigItemDto[] {
    const term = this.searchText.trim().toLowerCase();
    if (!term) return this.rows;
    return this.rows.filter((r) =>
      r.path.some(
        (s) =>
          s.areaItemName.toLowerCase().includes(term) ||
          s.areaTypeName.toLowerCase().includes(term),
      ),
    );
  }

  openScopeModal(row: LessonAreaConfigItemDto, event: MouseEvent): void {
    event.stopPropagation();
    if (row.lessonAreaId == null) return;
    this.scopeLessonAreaId = row.lessonAreaId;
    this.scopeEntityName = row.path.map((s) => s.areaItemName).join(' > ');
    this.showScopeModal = true;
    this.cdr.detectChanges();
  }
}
