import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AreaScopeService } from '../../../../shared/services/area-scope.service';
import { AreaScopeTreeDto } from '../../../../shared/dtos/areaScope.model';

interface ParentOption {
  /** area_scope_id del candidato. ROOT_ID (0) representa la raíz (sin padre). */
  areaScopeId: number;
  label: string;
}

@Component({
  selector: 'app-area-scope-edit-parent',
  standalone: true,
  imports: [CommonModule, BaseModal, SearchSelect],
  templateUrl: './area-scope-edit-parent.html',
})
export class AreaScopeEditParent implements OnInit {
  /** Nodo cuyo padre se va a reasignar (último nodo de la rama). */
  @Input({ required: true }) areaScopeId!: number;
  @Input() areaNombre = '';
  @Input() rutaRama = '';
  /** Árbol completo, para calcular los candidatos a nuevo padre. */
  @Input({ required: true }) tree: AreaScopeTreeDto[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly ROOT_ID = 0;
  options: ParentOption[] = [];
  currentParentId = this.ROOT_ID;
  selectedParentId: number | null = null;

  constructor(
    private service: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    const candidates: ParentOption[] = [
      { areaScopeId: this.ROOT_ID, label: '— Raíz (sin padre) —' },
    ];
    // Se excluye el propio nodo y todo su subárbol (moverse bajo un descendiente crearía un ciclo).
    const walk = (node: AreaScopeTreeDto, path: string[], parentId: number | null) => {
      if (node.areaScopeId === this.areaScopeId) {
        this.currentParentId = parentId ?? this.ROOT_ID;
        return;
      }
      const segments = [...path, node.areaItemName];
      candidates.push({ areaScopeId: node.areaScopeId, label: segments.join(' › ') });
      for (const child of node.children ?? []) walk(child, segments, node.areaScopeId);
    };
    for (const root of this.tree) walk(root, [], null);
    this.options = candidates;
    this.selectedParentId = this.currentParentId;
  }

  save(): void {
    if (this.selectedParentId === null) {
      Swal.fire({ icon: 'error', title: 'Selección vacía', text: 'Selecciona el nuevo nodo padre.' });
      return;
    }
    if (this.selectedParentId === this.currentParentId) {
      Swal.fire({ icon: 'info', title: 'Sin cambios', text: 'El nodo ya se encuentra bajo ese padre.' });
      return;
    }
    const newParent = this.selectedParentId === this.ROOT_ID ? null : this.selectedParentId;
    this.loaderService.show();
    this.service.updateParent(this.areaScopeId, { newParentAreaScopeId: newParent }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.saved.emit();
        this.closeModal.emit();
        Swal.fire({
          title: '¡Actualizado!',
          text: res.message ?? 'El nodo padre ha sido actualizado.',
          icon: 'success',
          confirmButtonColor: '#64BC04',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
