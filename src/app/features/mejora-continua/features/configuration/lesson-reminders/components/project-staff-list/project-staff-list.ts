import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { StatusBadge } from '../../../../../../../shared/components/status-badge/status-badge';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { LessonReminderService } from '../../services/lesson-reminder.service';
import { ProjectStaffReminderConfigItemDTO } from '../../dtos/projectStaffReminder.model';

@Component({
  selector: 'app-project-staff-list',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadge],
  templateUrl: './project-staff-list.html',
})
export class ProjectStaffList implements OnInit {
  rows: ProjectStaffReminderConfigItemDTO[] = [];
  searchText = '';

  constructor(
    private service: LessonReminderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getProjectStaff().subscribe({
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

  toggle(item: ProjectStaffReminderConfigItemDTO): void {
    this.loaderService.show();
    this.service.toggleProjectStaff(item.projectId).subscribe({
      next: (res) => {
        this.loaderService.hide();
        item.active = res.active;
        item.projectStaffReminderId = res.projectStaffReminderId;
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get filteredRows(): ProjectStaffReminderConfigItemDTO[] {
    const term = this.searchText.trim().toLowerCase();
    if (!term) return this.rows;
    return this.rows.filter(
      (r) =>
        (r.projectDescription ?? '').toLowerCase().includes(term) ||
        (r.staffEmail ?? '').toLowerCase().includes(term),
    );
  }
}
