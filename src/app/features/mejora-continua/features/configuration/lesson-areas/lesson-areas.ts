import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LessonAreaService } from './services/lesson-area.service';
import { LessonAreaConfigItemDto } from './dtos/lesson-area.dto';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';

@Component({
  standalone: true,
  selector: 'app-lesson-areas',
  imports: [CommonModule, FormsModule, StatusBadge],
  templateUrl: './lesson-areas.html',
})
export class LessonAreas implements OnInit {
  rows: LessonAreaConfigItemDto[] = [];
  searchText = '';

  constructor(
    private service: LessonAreaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getAll().subscribe({
      next: (data) => {
        this.rows = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggle(item: LessonAreaConfigItemDto): void {
    this.loaderService.show();
    this.service.toggle(item.areaScopeId).subscribe({
      next: (res) => {
        this.loaderService.hide();
        item.active = res.active;
        item.lessonAreaId = res.lessonAreaId;
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggleIncludeInForm(item: LessonAreaConfigItemDto): void {
    if (!item.active || !item.hasScope) return;
    this.loaderService.show();
    this.service.setIncludeInForm(item.areaScopeId, !item.includeInForm).subscribe({
      next: (res) => {
        this.loaderService.hide();
        item.includeInForm = res.value;
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggleIncludeDescendants(item: LessonAreaConfigItemDto): void {
    if (!item.active || !item.hasChildren) return;
    this.loaderService.show();
    this.service.setIncludeDescendants(item.areaScopeId, !item.includeDescendants).subscribe({
      next: (res) => {
        this.loaderService.hide();
        item.includeDescendants = res.value;
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggleIncludeAsIndependent(item: LessonAreaConfigItemDto): void {
    if (!item.active || !item.includeInForm) return;
    this.loaderService.show();
    this.service.setIncludeAsIndependent(item.areaScopeId, !item.includeAsIndependent).subscribe({
      next: (res) => {
        this.loaderService.hide();
        item.includeAsIndependent = res.value;
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
}
