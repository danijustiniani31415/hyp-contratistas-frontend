import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { LessonReminderService } from '../../services/lesson-reminder.service';
import { LessonReminderDTO } from '../../dtos/lessonReminder.model';
import { LessonReminderProjectDTO } from '../../dtos/lessonReminderCreateData.model';

@Component({
  selector: 'app-lesson-reminder-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './lesson-reminder-edit.html',
})
export class LessonReminderEdit implements OnInit {
  /** Recordatorio a editar. El trabajador no se puede cambiar; solo el proyecto. */
  @Input({ required: true }) item!: LessonReminderDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  projects: LessonReminderProjectDTO[] = [];
  selectedProjectId = 0;

  constructor(
    private service: LessonReminderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.selectedProjectId = this.item.projectId;
    this.loaderService.show();
    this.service.getCreateData().subscribe({
      next: (data) => {
        this.projects = data.projects ?? [];
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  save(): void {
    if (!this.selectedProjectId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccione un proyecto.' });
      return;
    }
    if (this.selectedProjectId === this.item.projectId) {
      this.closeModal.emit();
      return;
    }
    this.loaderService.show();
    this.service.updateProject(this.item.userProjectId, this.selectedProjectId).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({
          title: res.message ?? 'Recordatorio actualizado exitosamente',
          icon: 'success',
          confirmButtonColor: '#64BC04',
        });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
