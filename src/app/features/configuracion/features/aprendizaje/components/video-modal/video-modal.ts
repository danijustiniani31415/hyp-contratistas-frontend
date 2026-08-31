import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AprendizajeAdminService } from '../../services/aprendizaje-admin.service';
import { LearningCategoryAdminDto, LearningVideoAdminDto } from '../../dtos/aprendizaje.dto';

/** Alta/edición de un video-guía. Al editar no se cambia de grupo (solo sus datos). */
@Component({
  standalone: true,
  selector: 'app-aprendizaje-video-modal',
  imports: [BaseModal, SearchSelect, CommonModule, FormsModule],
  templateUrl: './video-modal.html',
})
export class VideoModal implements OnInit {
  /** Video a editar; null = alta. */
  @Input() video: LearningVideoAdminDto | null = null;
  /** Grupos disponibles (para elegir a cuál pertenece al crear). */
  @Input() categorias: LearningCategoryAdminDto[] = [];
  /** Grupo preseleccionado al crear (p. ej. el filtro activo de la tabla). */
  @Input() categoriaIdPreset: number | null = null;
  /** Nombre del grupo del video en edición (solo lectura; no se cambia de grupo al editar). */
  @Input() categoriaNombre = '';

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  categoriaId: number | null = null;
  titulo = '';
  url = '';
  img = '';
  orden = 0;
  submitted = false;

  constructor(
    private service: AprendizajeAdminService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    if (this.video) {
      this.titulo = this.video.titulo;
      this.url = this.video.url;
      this.img = this.video.img ?? '';
      this.orden = this.video.orden;
    } else {
      this.categoriaId = this.categoriaIdPreset ?? this.categorias[0]?.id ?? null;
    }
  }

  get esEdicion(): boolean {
    return this.video != null;
  }

  save(): void {
    this.submitted = true;
    if (!this.titulo.trim() || !this.url.trim()) return;
    if (!this.esEdicion && this.categoriaId == null) return;

    this.loaderService.show();
    const req$ = this.esEdicion
      ? this.service.editVideo(this.video!.id, {
          titulo: this.titulo.trim(),
          url: this.url.trim(),
          img: this.img.trim() || null,
          orden: this.orden ?? 0,
        })
      : this.service.createVideo({
          categoriaId: this.categoriaId!,
          titulo: this.titulo.trim(),
          url: this.url.trim(),
          img: this.img.trim() || null,
          orden: this.orden ?? 0,
        });

    req$.subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ title: res.message, icon: 'success' });
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
