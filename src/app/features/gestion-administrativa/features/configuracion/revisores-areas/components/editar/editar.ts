import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { RevisoresAreasService } from '../../services/revisores-areas.service';
import {
  AreaRevisorAsignadoDTO,
  AreaRevisorItemDTO,
  AreaRevisorOptionDTO,
} from '../../dtos/areaRevisor.model';

/** Fila editable: la posición en la lista define la prioridad (1 = primera). */
interface RevisorRow {
  revisorWorkerId: number | null;
  active: boolean;
}

/**
 * Modal de edición de los n revisores de un área. El orden de las filas
 * define la prioridad (se puede subir/bajar); el toggle Activo permite
 * "pausar" a un revisor (ej. ausencia temporal) sin quitarlo de la lista.
 */
@Component({
  standalone: true,
  selector: 'app-revisores-areas-editar',
  imports: [CommonModule, BaseModal, SearchSelect],
  templateUrl: './editar.html',
})
export class RevisoresAreasEditar implements OnInit {
  @Input() area!: AreaRevisorItemDTO;
  @Input() options: AreaRevisorOptionDTO[] = [];
  /** null = revisores a nivel de área; con valor = revisores del proyecto dentro del área. */
  @Input() projectId: number | null = null;
  /** Nombre del proyecto (para el título) cuando se edita el alcance de un proyecto. */
  @Input() projectName?: string;
  /** Revisores iniciales del alcance editado. Por defecto los revisores de área. */
  @Input() revisoresIniciales?: AreaRevisorAsignadoDTO[];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  rows: RevisorRow[] = [];

  get titulo(): string {
    return this.projectName
      ? 'EDITAR REVISORES · ' + this.projectName
      : 'EDITAR REVISORES · ' + (this.area.areaName || 'Área');
  }

  constructor(
    private service: RevisoresAreasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    const iniciales = this.revisoresIniciales ?? this.area.revisores ?? [];
    this.rows = [...iniciales]
      .sort((a, b) => a.ordenPrioridad - b.ordenPrioridad)
      .map((r) => ({ revisorWorkerId: r.revisorWorkerId, active: r.active }));
    if (this.rows.length === 0) this.agregar();
  }

  /** Opciones de una fila: todos menos los ya elegidos en otras filas. */
  opcionesFila(index: number): AreaRevisorOptionDTO[] {
    const usados = new Set(
      this.rows.filter((_, i) => i !== index).map((r) => r.revisorWorkerId),
    );
    return this.options.filter((o) => !usados.has(o.workerId));
  }

  agregar(): void {
    this.rows.push({ revisorWorkerId: null, active: true });
  }

  quitar(index: number): void {
    this.rows.splice(index, 1);
  }

  mover(index: number, delta: number): void {
    const destino = index + delta;
    if (destino < 0 || destino >= this.rows.length) return;
    [this.rows[index], this.rows[destino]] = [this.rows[destino], this.rows[index]];
  }

  guardar(): void {
    const validas = this.rows.filter((r) => r.revisorWorkerId != null);
    if (validas.length !== this.rows.length) {
      Swal.fire({
        icon: 'warning',
        title: 'Filas incompletas',
        text: 'Selecciona un revisor en cada fila o quita las filas vacías.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    this.loaderService.show();
    this.service
      .updateRevisores(this.area.areaScopeId, {
        projectId: this.projectId,
        // La posición define la prioridad: 1 = primera fila.
        revisores: validas.map((r, i) => ({
          revisorWorkerId: r.revisorWorkerId!,
          ordenPrioridad: i + 1,
          active: r.active,
        })),
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
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
