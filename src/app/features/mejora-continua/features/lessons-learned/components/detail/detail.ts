import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { DraggableImage } from '../../../../../../shared/components/draggable-image/draggable-image';
import { LeccionesAprendidasService } from '../../services/lecciones-aprendidas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LessonDetailDTO, LessonImageDTO } from '../../dtos/lessonDetail.model';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiMessageDTO } from '../../../../../../core/dtos/api/ApiMessage.model';
import { environment } from '../../../../../../../environments/environment';
import { PeriodLabelPipe } from '../../../../../../shared/pipes/period-label.pipe';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-detail-lesson',
  standalone: true,
  imports: [CommonModule, BaseModal, DraggableImage, PeriodLabelPipe],
  templateUrl: './detail.html',
})
export class DetailLesson implements OnInit {
  @Input() lessonId!: number;
  @Input() currentUserId!: number;
  @Input() defaultTab: 'general' | 'images' = 'general';
  @Output() closeModal = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();
  /** Emite el lessonId para que el padre abra el modal de edición. */
  @Output() edit = new EventEmitter<number>();
  /** Emite cuando la lección fue aprobada/rechazada (para que el padre recargue la lista). */
  @Output() reviewed = new EventEmitter<void>();

  lesson: LessonDetailDTO | null = null;
  activeTab: 'general' | 'images' = 'general';
  opportunityImages: LessonImageDTO[] = [];
  improvementImages: LessonImageDTO[] = [];
  apiUrl = environment.apiUrl;

  constructor(
    private lessonService: LeccionesAprendidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  private getStandardColor(): string {
    return getComputedStyle(document.documentElement).getPropertyValue('--color-abril-standard').trim() || '#0F6E56';
  }

  ngOnInit(): void {
    this.activeTab = this.defaultTab;
    this.loadLesson();
  }

  private loadLesson(): void {
    this.loaderService.show();
    this.lessonService.getById(this.lessonId).subscribe({
      next: (data) => {
        this.lesson = data;
        this.opportunityImages = data.images?.filter(img => img.imageTypeDescription === 'OPORTUNIDAD') || [];
        this.improvementImages = data.images?.filter(img => img.imageTypeDescription === 'MEJORA') || [];
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  approve(event: MouseEvent): void {
    event.stopPropagation();
    this.loaderService.show();
    this.lessonService.approveLesson(this.lessonId).subscribe({
      next: (res: ApiMessageDTO) => {
        this.loaderService.hide();
        Swal.fire({ title: 'Lección aprobada', text: res.message ?? '', icon: 'success', confirmButtonColor: this.getStandardColor() });
        this.reviewed.emit();
        this.loadLesson();
      },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  reject(event: MouseEvent): void {
    event.stopPropagation();
    Swal.fire({
      title: 'Rechazar lección',
      input: 'textarea',
      inputLabel: 'Comentario para el autor (opcional)',
      inputPlaceholder: 'Indica qué debe corregir...',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: this.getStandardColor(),
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Rechazar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      const comment = ((result.value as string) || '').trim() || null;
      this.loaderService.show();
      this.lessonService.rejectLesson(this.lessonId, comment).subscribe({
        next: (res: ApiMessageDTO) => {
          this.loaderService.hide();
          Swal.fire({ title: 'Lección rechazada', text: res.message ?? '', icon: 'success', confirmButtonColor: this.getStandardColor() });
          this.reviewed.emit();
          this.loadLesson();
        },
        error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
      });
    });
  }

  editLesson(event: MouseEvent): void {
    event.stopPropagation();
    this.edit.emit(this.lessonId);
  }

  deleteLesson(event: MouseEvent): void {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estas seguro/a?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: this.getStandardColor(),
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Si, eliminalo!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loaderService.show();
        this.lessonService.deleteLesson(this.lesson?.lessonId).subscribe({
          next: (response: ApiMessageDTO) => {
            this.loaderService.hide();
            Swal.fire({
              title: 'Eliminado!',
              text: response.message ?? 'El registro ha sido eliminado.',
              confirmButtonColor: this.getStandardColor(),
              icon: 'success',
            });
            this.deleted.emit();
            this.closeModal.emit();
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      }
    });
  }
}
