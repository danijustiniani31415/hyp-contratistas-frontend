import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { SectionTabs, SectionTab } from '../../../../../../shared/components/section-tabs/section-tabs';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { LessonReminderService } from '../services/lesson-reminder.service';
import {
  LessonReminderDTO,
  LessonReminderPagedDTO,
  LessonReminderWorkerOptionDTO,
} from '../dtos/lessonReminder.model';
import { LessonReminderCreate } from './lesson-reminder-create/lesson-reminder-create';
import { LessonReminderEdit } from './lesson-reminder-edit/lesson-reminder-edit';
import { ProjectStaffList } from './project-staff-list/project-staff-list';
import { JefeList } from './jefe-list/jefe-list';
import { WorkerRevisorList } from './worker-revisor-list/worker-revisor-list';

import { MEJORA_CONTINUA_TABS } from '../../../../shared/mejora-continua-tabs';
type ReminderSection = 'users' | 'staff' | 'jefes' | 'revisores';

@Component({
  selector: 'app-lesson-reminders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Paginator,
    SectionTabs,
    StatusBadge,
    SearchSelect,
    LessonReminderCreate,
    LessonReminderEdit,
    ProjectStaffList,
    JefeList,
    WorkerRevisorList,
    AbrilPageHeaderComponent,
  ],
  templateUrl: './lesson-reminders.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class LessonReminders implements OnInit {
  readonly tabs = MEJORA_CONTINUA_TABS;
  anioActual = new Date().getFullYear();
  activeSection: ReminderSection = 'users';
  readonly sectionTabs: SectionTab[] = [
    { id: 'users', label: 'Trabajadores' },
    { id: 'staff', label: 'Staff de proyectos' },
    { id: 'jefes', label: 'Jefaturas' },
    { id: 'revisores', label: 'Revisor de Trabajadores' },
  ];

  // Subáreas (hardcodeadas) para el filtro de la lista de usuarios.
  // Provienen de los valores distintos de workers.subarea.
  readonly subareaOptions: { value: string; label: string }[] = [
    'Administración',
    'Administración Obra',
    'Almacenero',
    'Arquitectura',
    'Arquitectura Comercial',
    'Calidad',
    'Contabilidad',
    'Costos y Presupuestos',
    'Finanzas',
    'Gestión del Talento Humano',
    'Ingeniería BIM',
    'Legal',
    'Logística',
    'Marketing',
    'Planeamiento BIM',
    'Post Venta',
    'Producción',
    'Proyectos',
    'Residencia',
    'SSOMA',
    'Tecnología de la Información',
    'Trámites Documentarios',
    'Unidad de Proyectos',
    'Ventas',
  ].map((s) => ({ value: s, label: s }));

  selectedSubarea: string | null = null;

  // Filtro por trabajador (sección "Trabajadores"). Las opciones se cargan una
  // sola vez en la carga inicial (includeWorkers=true) y no se vuelven a pedir.
  workerOptions: LessonReminderWorkerOptionDTO[] = [];
  selectedWorkerId: number | null = null;

  paged: LessonReminderPagedDTO = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  currentPage = 1;
  showCreateModal = false;
  showEditModal = false;
  editingItem: LessonReminderDTO | null = null;

  constructor(
    private service: LessonReminderService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    // Carga inicial: tabla + opciones del filtro por trabajador en una sola petición.
    this.load(1, true);
  }

  onSectionChange(id: string): void {
    this.activeSection = id as ReminderSection;
  }

  load(page: number = 1, includeWorkers: boolean = false): void {
    this.loaderService.show();
    this.service
      .getPaged(page, 10, this.selectedSubarea, this.selectedWorkerId, includeWorkers)
      .subscribe({
        next: (res) => {
          this.paged = res;
          this.currentPage = res.page;
          if (includeWorkers && res.workers) {
            this.workerOptions = res.workers;
          }
          this.loaderService.hide();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  changePage(page: number): void {
    this.load(page);
  }

  onSubareaChange(value: string | null): void {
    this.selectedSubarea = value;
    this.load(1);
  }

  onWorkerChange(value: number | null): void {
    this.selectedWorkerId = value;
    this.load(1);
  }

  openCreateModal(event: MouseEvent): void {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  onCreated(): void {
    this.showCreateModal = false;
    this.load(this.currentPage || 1);
  }

  openEditModal(item: LessonReminderDTO, event: MouseEvent): void {
    event.stopPropagation();
    this.editingItem = item;
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingItem = null;
  }

  onEdited(): void {
    this.closeEditModal();
    this.load(this.currentPage || 1);
  }

  toggle(item: LessonReminderDTO, event: MouseEvent): void {
    event.stopPropagation();
    this.loaderService.show();
    this.service.toggleActive(item.userProjectId).subscribe({
      next: (res) => {
        this.loaderService.hide();
        item.active = res.active;
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  delete(item: LessonReminderDTO, event: MouseEvent): void {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      text: `Se eliminará el recordatorio de "${item.workerFullName ?? ''}" en "${item.projectDescription ?? ''}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.service.delete(item.userProjectId).subscribe({
        next: (res: ApiMessageDTO) => {
          this.loaderService.hide();
          this.load(this.currentPage || 1);
          Swal.fire({
            title: '¡Eliminado!',
            text: res.message ?? 'El registro ha sido eliminado.',
            icon: 'success',
            confirmButtonColor: '#64BC04',
          });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
