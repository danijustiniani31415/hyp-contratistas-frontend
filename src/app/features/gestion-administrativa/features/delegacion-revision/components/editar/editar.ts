import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { DelegacionRevisionService } from '../../services/delegacion-revision.service';
import { DelegacionAsignacionItemDTO, DelegacionOptionDTO } from '../../dtos/delegacion.model';

/** Fila editable: la posición define la prioridad. `isSelf` = el propio usuario (no removible). */
interface RevisorRow {
  revisorWorkerId: number | null;
  active: boolean;
  isSelf: boolean;
}

/**
 * Modal para que el revisor autogestione los revisores de su área/proyecto:
 * designar suplentes (delegar), reordenar prioridad y activarse/desactivarse.
 * El propio usuario no puede quitarse (solo desactivarse) para poder retomar
 * el puesto cuando quiera.
 */
@Component({
  standalone: true,
  selector: 'app-delegacion-editar',
  imports: [CommonModule, BaseModal, SearchSelect, TitleCasePipe],
  templateUrl: './editar.html',
})
export class DelegacionEditar implements OnInit {
  @Input() asignacion!: DelegacionAsignacionItemDTO;
  @Input() currentWorkerId!: number;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  rows: RevisorRow[] = [];
  private nombreById = new Map<number, string>();

  constructor(
    private service: DelegacionRevisionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    for (const o of this.asignacion.options ?? []) {
      if (o.fullName) this.nombreById.set(o.workerId, o.fullName);
    }
    for (const r of this.asignacion.revisores ?? []) {
      if (r.revisorFullName) this.nombreById.set(r.revisorWorkerId, r.revisorFullName);
    }

    this.rows = [...(this.asignacion.revisores ?? [])]
      .sort((a, b) => a.ordenPrioridad - b.ordenPrioridad)
      .map((r) => ({
        revisorWorkerId: r.revisorWorkerId,
        active: r.active,
        isSelf: r.revisorWorkerId === this.currentWorkerId,
      }));

    // El usuario debe figurar siempre como revisor (no se puede quitar). Si por algún
    // motivo no estuviera, se agrega al final activo.
    if (!this.rows.some((r) => r.isSelf)) {
      this.rows.push({ revisorWorkerId: this.currentWorkerId, active: true, isSelf: true });
    }
  }

  get titulo(): string {
    return this.asignacion.projectName
      ? 'REVISORES · ' + this.asignacion.projectName
      : 'REVISORES · ' + (this.asignacion.areaName || 'Área');
  }

  nombreDe(workerId: number | null): string {
    if (workerId == null) return '';
    return this.nombreById.get(workerId) ?? '';
  }

  /** Opciones de una fila: los trabajadores del área menos uno mismo y los ya elegidos. */
  opcionesFila(index: number): DelegacionOptionDTO[] {
    const usados = new Set(this.rows.filter((_, i) => i !== index).map((r) => r.revisorWorkerId));
    return (this.asignacion.options ?? []).filter(
      (o) => o.workerId !== this.currentWorkerId && !usados.has(o.workerId),
    );
  }

  agregar(): void {
    this.rows.push({ revisorWorkerId: null, active: true, isSelf: false });
  }

  quitar(index: number): void {
    if (this.rows[index]?.isSelf) return; // no removible
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
      .update(this.asignacion.areaScopeId, {
        projectId: this.asignacion.projectId ?? null,
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
