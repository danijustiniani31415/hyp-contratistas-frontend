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
import {
  LearningCategoryAdminDto,
  LearningRoleOptionDto,
  LearningSurfaceDto,
} from '../../dtos/aprendizaje.dto';

/**
 * Alta/edición de un grupo del Centro de aprendizaje. La superficie (login/inicio) y
 * la visibilidad (público interno / roles) definen dónde y a quién se muestran sus videos.
 */
@Component({
  standalone: true,
  selector: 'app-aprendizaje-category-modal',
  imports: [BaseModal, SearchSelect, CommonModule, FormsModule],
  templateUrl: './category-modal.html',
})
export class CategoryModal implements OnInit {
  /** Grupo a editar; null = alta. */
  @Input() categoria: LearningCategoryAdminDto | null = null;
  @Input() superficies: LearningSurfaceDto[] = [];
  @Input() roles: LearningRoleOptionDto[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  nombre = '';
  surfaceId: number | null = null;
  orden = 0;
  accentColor = '';
  esPublicoInterno = false;
  selectedRoleIds: number[] = [];
  submitted = false;

  constructor(
    private service: AprendizajeAdminService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    if (this.categoria) {
      this.nombre = this.categoria.nombre;
      this.surfaceId = this.categoria.surfaceId;
      this.orden = this.categoria.orden;
      this.accentColor = this.categoria.accentColor ?? '';
      this.esPublicoInterno = this.categoria.esPublicoInterno;
      this.selectedRoleIds = [...this.categoria.roleIds];
    } else {
      this.surfaceId = this.superficies.find((s) => s.code === 'INICIO')?.id ?? this.superficies[0]?.id ?? null;
    }
  }

  get esEdicion(): boolean {
    return this.categoria != null;
  }

  /** La superficie seleccionada es INICIO (la única donde aplica la visibilidad por rol). */
  get isInicio(): boolean {
    return this.superficies.find((s) => s.id === this.surfaceId)?.code === 'INICIO';
  }

  /** Se pide elegir roles solo en INICIO y cuando el grupo NO es público interno. */
  get showRoles(): boolean {
    return this.isInicio && !this.esPublicoInterno;
  }

  isRoleSelected(id: number): boolean {
    return this.selectedRoleIds.includes(id);
  }

  toggleRole(id: number): void {
    this.selectedRoleIds = this.isRoleSelected(id)
      ? this.selectedRoleIds.filter((r) => r !== id)
      : [...this.selectedRoleIds, id];
  }

  save(): void {
    this.submitted = true;
    if (!this.nombre.trim() || this.surfaceId == null) return;
    if (this.showRoles && this.selectedRoleIds.length === 0) return;

    // En LOGIN la visibilidad es pública (sin roles); solo INICIO usa roles/público interno.
    const esPublico = this.isInicio ? this.esPublicoInterno : false;
    const roleIds = this.isInicio && !esPublico ? this.selectedRoleIds : [];

    const dto = {
      nombre: this.nombre.trim(),
      surfaceId: this.surfaceId,
      accentColor: this.accentColor.trim() || null,
      orden: this.orden ?? 0,
      esPublicoInterno: esPublico,
      roleIds,
    };

    this.loaderService.show();
    const req$ = this.esEdicion
      ? this.service.editCategory(this.categoria!.id, dto)
      : this.service.createCategory(dto);

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
