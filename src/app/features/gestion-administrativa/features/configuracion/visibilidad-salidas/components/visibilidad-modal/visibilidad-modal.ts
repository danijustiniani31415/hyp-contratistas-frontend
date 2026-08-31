import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { SearchInput } from '../../../../../../../shared/components/search-input/search-input';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { VisibilidadSalidasService } from '../../services/visibilidad-salidas.service';
import { VisibilidadAreaNodeDTO } from '../../dtos/visibilidadSalida.model';

type NodeSel = 'self' | 'subtree';

interface OrderedNode {
  node: VisibilidadAreaNodeDTO;
  depth: number;
}

@Component({
  standalone: true,
  selector: 'app-visibilidad-modal',
  imports: [CommonModule, BaseModal, SearchInput],
  templateUrl: './visibilidad-modal.html',
})
export class VisibilidadModal implements OnInit {
  @Input() workerId!: number;
  @Input() workerName = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  ordered: OrderedNode[] = [];
  /** areaScopeId -> tipo de selección. Ausente = no seleccionado. */
  selection = new Map<number, NodeSel>();

  /** Tipos de área disponibles (para los filtros). */
  tipos: { id: number; name: string }[] = [];
  /** Filtro por tipo de área activo (vacío = todos). */
  tipoFilter = new Set<number>();
  searchText = '';

  loaded = false;

  constructor(
    private service: VisibilidadSalidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getAreaTree().subscribe({
      next: (nodes) => {
        this.buildOrdered(nodes);
        this.buildTipos(nodes);
        this.service.getWorkerAsignaciones(this.workerId).subscribe({
          next: (asigs) => {
            this.selection.clear();
            for (const a of asigs) {
              this.selection.set(a.areaScopeId, a.incluyeDescendientes ? 'subtree' : 'self');
            }
            this.loaded = true;
            this.loaderService.hide();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private buildOrdered(nodes: VisibilidadAreaNodeDTO[]): void {
    const byParent = new Map<number | null, VisibilidadAreaNodeDTO[]>();
    for (const n of nodes) {
      const key = n.areaScopeParentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(n);
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => a.displayOrder - b.displayOrder || a.areaItemName.localeCompare(b.areaItemName));
    }
    const result: OrderedNode[] = [];
    const dfs = (parentKey: number | null, depth: number) => {
      const children = byParent.get(parentKey) ?? [];
      for (const child of children) {
        result.push({ node: child, depth });
        dfs(child.areaScopeId, depth + 1);
      }
    };
    dfs(null, 0);
    this.ordered = result;
  }

  private buildTipos(nodes: VisibilidadAreaNodeDTO[]): void {
    const seen = new Map<number, string>();
    for (const n of nodes) if (!seen.has(n.areaTypeId)) seen.set(n.areaTypeId, n.areaTypeName);
    this.tipos = [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.id - b.id);
  }

  // ── Filtros ────────────────────────────────────────────────────────
  toggleTipo(id: number): void {
    if (this.tipoFilter.has(id)) this.tipoFilter.delete(id);
    else this.tipoFilter.add(id);
  }

  get filtered(): OrderedNode[] {
    const q = this.searchText.trim();
    return this.ordered.filter((o) => {
      const okTipo = this.tipoFilter.size === 0 || this.tipoFilter.has(o.node.areaTypeId);
      const okText = !q || SearchInput.matches(o.node.areaItemName, q);
      return okTipo && okText;
    });
  }

  /** Cuando hay filtro/búsqueda la jerarquía se rompe → mostrar plano (sin sangría). */
  displayDepth(o: OrderedNode): number {
    return this.tipoFilter.size > 0 || this.searchText.trim() ? 0 : o.depth;
  }

  // ── Selección por nodo ─────────────────────────────────────────────
  isSelf(id: number): boolean {
    return this.selection.has(id);
  }

  isSubtree(id: number): boolean {
    return this.selection.get(id) === 'subtree';
  }

  toggleSelf(id: number): void {
    if (this.selection.has(id)) this.selection.delete(id);
    else this.selection.set(id, 'self');
  }

  toggleSubtree(id: number): void {
    if (this.selection.get(id) === 'subtree') this.selection.set(id, 'self');
    else this.selection.set(id, 'subtree');
  }

  // ── Acciones masivas ───────────────────────────────────────────────
  /** Selecciona (solo el nodo) todas las áreas actualmente visibles según los filtros. */
  seleccionarVisibles(): void {
    for (const o of this.filtered) {
      if (!this.selection.has(o.node.areaScopeId)) this.selection.set(o.node.areaScopeId, 'self');
    }
  }

  /** Selecciona las áreas visibles incluyendo sus subáreas (nodo + descendientes). */
  seleccionarVisiblesConSubareas(): void {
    for (const o of this.filtered) this.selection.set(o.node.areaScopeId, 'subtree');
  }

  limpiar(): void {
    this.selection.clear();
  }

  get seleccionadas(): number {
    return this.selection.size;
  }

  save(): void {
    const areas = [...this.selection.entries()].map(([areaScopeId, sel]) => ({
      areaScopeId,
      incluyeDescendientes: sel === 'subtree',
    }));

    this.loaderService.show();
    this.service.updateWorkerAsignaciones(this.workerId, areas).subscribe({
      next: (res) => {
        this.loaderService.hide();
        Swal.fire({ title: res.message, icon: 'success', timer: 1500, showConfirmButton: false });
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
