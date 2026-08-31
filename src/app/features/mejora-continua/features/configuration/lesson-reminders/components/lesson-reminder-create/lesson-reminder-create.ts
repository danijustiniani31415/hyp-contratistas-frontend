import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { LessonReminderService } from '../../services/lesson-reminder.service';
import { LessonReminderCreateDTO } from '../../dtos/lessonReminderCreate.model';
import {
  LessonReminderProjectDTO,
  LessonReminderWorkerDTO,
} from '../../dtos/lessonReminderCreateData.model';

@Component({
  selector: 'app-lesson-reminder-create',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './lesson-reminder-create.html',
})
export class LessonReminderCreate implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly estadoOptions = [
    { id: true, name: 'ACTIVO' },
    { id: false, name: 'INACTIVO' },
  ];

  dto: LessonReminderCreateDTO = {
    workerId: 0,
    projectId: 0,
    active: true,
  };

  workers: LessonReminderWorkerDTO[] = [];
  projects: LessonReminderProjectDTO[] = [];

  constructor(
    private service: LessonReminderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getCreateData().subscribe({
      next: (data) => {
        this.workers = data.workers ?? [];
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
    if (!this.dto.workerId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccione un trabajador.' });
      return;
    }
    if (!this.dto.projectId) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccione un proyecto.' });
      return;
    }
    this.loaderService.show();
    this.service.create(this.dto).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({
          title: res.message ?? 'Recordatorio creado exitosamente',
          icon: 'success',
          confirmButtonColor: '#64BC04',
        });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
