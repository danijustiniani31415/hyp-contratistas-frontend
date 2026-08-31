import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { DatePicker } from '../../../../../../../shared/components/date-picker/date-picker';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { CronogramaService } from '../../../services/cronograma.service';
import { CronogramaNodoDTO } from '../../../dtos/cronograma.dto';

interface FlatActividad {
  actividadId: number;
  nombre: string;
  checked: boolean;
  parentActividadId: number | null;
  displayOrder: number;
  fechaInicio: string | null;
  fechaFin: string | null;
}

interface TreeNode {
  item: FlatActividad;
  depth: number;
  canUp: boolean;
  canDown: boolean;
  canIndent: boolean;
  canOutdent: boolean;
}

interface TreeRow {
  kind: 'node' | 'gap';
  node: TreeNode | null;
  gapParentId: number | null;
  gapBeforeId: number | null;
  gapDepth: number;
  gapKey: string;
}

/**
 * Modal del paso 3 de adjudicaciones para armar el cronograma de actividades.
 * Mecánica de jerarquía tomada de "Nueva relación de áreas" (configuración/área);
 * paleta visual del cronograma de actividades de Proyectos.
 */
@Component({
  selector: 'app-cronograma-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, DatePicker],
  templateUrl: './cronograma-modal.html',
})
export class CronogramaModal implements OnInit, OnDestroy {
  @Input({ required: true }) projectSubContractorId!: number;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild('treeScroll') treeScrollRef?: ElementRef<HTMLElement>;

  private scrollIntervalId: number | null = null;
  private scrollDirection = 0;
  private readonly EDGE_SIZE = 48;
  private readonly SCROLL_STEP = 12;

  items: FlatActividad[] = [];
  searchTerm = '';
  loading = true;
  saving = false;

  /** Formulario inline para crear una actividad nueva en el catálogo. */
  newActividadNombre = '';
  creatingActividad = false;

  filteredItems: FlatActividad[] = [];
  visibleTree: TreeNode[] = [];
  visibleTreeRows: TreeRow[] = [];

  draggedItem: FlatActividad | null = null;
  dropTargetId: number | null = null;
  dropGapKey: string | null = null;

  constructor(
    private cronogramaService: CronogramaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.cronogramaService.getFormData(this.projectSubContractorId).subscribe({
      next: (data) => {
        const nodosPorActividad = new Map<number, CronogramaNodoDTO>(
          data.nodos.map((n) => [n.actividadId, n]),
        );
        this.items = data.actividades.map((a) => {
          const nodo = nodosPorActividad.get(a.costosCronogramaActividadId);
          return {
            actividadId: a.costosCronogramaActividadId,
            nombre: a.nombre,
            checked: !!nodo,
            parentActividadId: nodo?.parentActividadId ?? null,
            displayOrder: nodo?.orden ?? 0,
            fechaInicio: nodo?.fechaInicio ? nodo.fechaInicio.substring(0, 10) : null,
            fechaFin: nodo?.fechaFin ? nodo.fechaFin.substring(0, 10) : null,
          };
        });
        this.recomputeFiltered();
        this.recomputeTree();
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Catálogo (izq) ─────────────────────────────────────────────────────────

  get checkedCount(): number {
    return this.items.filter((i) => i.checked).length;
  }

  get totalCount(): number {
    return this.items.length;
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.recomputeFiltered();
  }

  private recomputeFiltered(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredItems = term
      ? this.items.filter((i) => i.nombre.toLowerCase().includes(term))
      : [...this.items];
  }

  addActividad(): void {
    const nombre = this.newActividadNombre.trim();
    if (!nombre || this.creatingActividad) return;
    this.creatingActividad = true;
    this.loaderService.show();
    this.cronogramaService.createActividad(nombre).subscribe({
      next: (actividad) => {
        this.loaderService.hide();
        this.creatingActividad = false;
        this.newActividadNombre = '';
        const nueva: FlatActividad = {
          actividadId: actividad.costosCronogramaActividadId,
          nombre: actividad.nombre,
          checked: false,
          parentActividadId: null,
          displayOrder: 0,
          fechaInicio: null,
          fechaFin: null,
        };
        this.items = [...this.items, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre));
        // Se marca de una vez para que aparezca en la jerarquía.
        this.setChecked(nueva, true, true);
        this.recomputeFiltered();
        this.recomputeTree();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.creatingActividad = false;
        this.errorService.handleError(err);
      },
    });
  }

  toggleAll(checked: boolean): void {
    this.filteredItems.forEach((i) => this.setChecked(i, checked, false));
    this.renumberSiblings();
    this.recomputeTree();
  }

  toggleCheck(item: FlatActividad, checked: boolean): void {
    this.setChecked(item, checked, true);
    this.recomputeTree();
  }

  private setChecked(item: FlatActividad, checked: boolean, renumber: boolean): void {
    if (item.checked === checked) return;
    if (checked) {
      item.checked = true;
      item.parentActividadId = null;
      const rootsCount = this.items.filter(
        (i) => i.checked && i !== item && i.parentActividadId === null,
      ).length;
      item.displayOrder = rootsCount + 1;
    } else {
      const newParentId = item.parentActividadId;
      for (const child of this.items) {
        if (child.checked && child.parentActividadId === item.actividadId) {
          child.parentActividadId = newParentId;
        }
      }
      item.checked = false;
      item.parentActividadId = null;
      item.displayOrder = 0;
      item.fechaInicio = null;
      item.fechaFin = null;
    }
    if (renumber) this.renumberSiblings();
  }

  trackByItemId(_: number, item: FlatActividad): number {
    return item.actividadId;
  }

  // ── Árbol (der) ────────────────────────────────────────────────────────────

  private getSiblings(item: FlatActividad): FlatActividad[] {
    return this.items
      .filter((i) => i.checked && i.parentActividadId === item.parentActividadId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  moveUp(item: FlatActividad): void {
    const siblings = this.getSiblings(item);
    const idx = siblings.indexOf(item);
    if (idx <= 0) return;
    const prev = siblings[idx - 1];
    [item.displayOrder, prev.displayOrder] = [prev.displayOrder, item.displayOrder];
    this.recomputeTree();
  }

  moveDown(item: FlatActividad): void {
    const siblings = this.getSiblings(item);
    const idx = siblings.indexOf(item);
    if (idx === -1 || idx >= siblings.length - 1) return;
    const next = siblings[idx + 1];
    [item.displayOrder, next.displayOrder] = [next.displayOrder, item.displayOrder];
    this.recomputeTree();
  }

  indent(item: FlatActividad): void {
    const siblings = this.getSiblings(item);
    const idx = siblings.indexOf(item);
    if (idx <= 0) return;
    const newParent = siblings[idx - 1];
    item.parentActividadId = newParent.actividadId;
    const newSiblings = this.items.filter(
      (i) => i.checked && i.parentActividadId === newParent.actividadId && i !== item,
    );
    item.displayOrder = newSiblings.length + 1;
    this.renumberSiblings();
    this.recomputeTree();
  }

  outdent(item: FlatActividad): void {
    if (item.parentActividadId === null) return;
    const parent = this.items.find((i) => i.actividadId === item.parentActividadId);
    if (!parent) return;
    item.parentActividadId = parent.parentActividadId;
    item.displayOrder = parent.displayOrder + 0.5;
    this.renumberSiblings();
    this.recomputeTree();
  }

  removeFromTree(item: FlatActividad): void {
    this.setChecked(item, false, true);
    this.recomputeTree();
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  private isDescendantOf(item: FlatActividad, ancestor: FlatActividad): boolean {
    let currentParentId: number | null = item.parentActividadId;
    let safety = 200;
    while (currentParentId !== null && safety-- > 0) {
      if (currentParentId === ancestor.actividadId) return true;
      const parent = this.items.find((i) => i.actividadId === currentParentId);
      currentParentId = parent?.parentActividadId ?? null;
    }
    return false;
  }

  canDropOn(target: FlatActividad): boolean {
    const dragged = this.draggedItem;
    if (!dragged) return false;
    if (dragged.actividadId === target.actividadId) return false;
    if (this.isDescendantOf(target, dragged)) return false;
    return true;
  }

  onDragStart(item: FlatActividad, event: DragEvent): void {
    this.draggedItem = item;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(item.actividadId));
    }
  }

  onDragOver(target: FlatActividad, event: DragEvent): void {
    if (!this.canDropOn(target)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.dropTargetId !== target.actividadId) {
      this.dropTargetId = target.actividadId;
      this.dropGapKey = null;
    }
  }

  onDragLeave(target: FlatActividad): void {
    if (this.dropTargetId === target.actividadId) {
      this.dropTargetId = null;
    }
  }

  onDrop(target: FlatActividad, event: DragEvent): void {
    event.preventDefault();
    const dragged = this.draggedItem;
    this.draggedItem = null;
    this.dropTargetId = null;
    if (!dragged) return;
    if (dragged.actividadId === target.actividadId) return;
    if (this.isDescendantOf(target, dragged)) return;
    if (dragged.parentActividadId === target.actividadId) return;

    dragged.parentActividadId = target.actividadId;
    const newSiblings = this.items.filter(
      (i) => i.checked && i.parentActividadId === target.actividadId && i !== dragged,
    );
    dragged.displayOrder = newSiblings.length + 1;
    this.renumberSiblings();
    this.recomputeTree();
  }

  isInDraggedSubtree(item: FlatActividad): boolean {
    if (!this.draggedItem) return false;
    if (item.actividadId === this.draggedItem.actividadId) return true;
    return this.isDescendantOf(item, this.draggedItem);
  }

  canDropOnGap(row: TreeRow): boolean {
    const dragged = this.draggedItem;
    if (!dragged || row.kind !== 'gap') return false;
    if (row.gapBeforeId === dragged.actividadId) return false;
    if (row.gapParentId !== null) {
      if (row.gapParentId === dragged.actividadId) return false;
      const newParent = this.items.find((i) => i.actividadId === row.gapParentId);
      if (newParent && this.isDescendantOf(newParent, dragged)) return false;
    }
    return true;
  }

  onDragOverGap(row: TreeRow, event: DragEvent): void {
    if (!this.canDropOnGap(row)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.dropGapKey !== row.gapKey) {
      this.dropGapKey = row.gapKey;
      this.dropTargetId = null;
    }
  }

  onDragLeaveGap(row: TreeRow): void {
    if (this.dropGapKey === row.gapKey) this.dropGapKey = null;
  }

  onDropGap(row: TreeRow, event: DragEvent): void {
    event.preventDefault();
    if (row.kind !== 'gap') return;
    if (!this.canDropOnGap(row)) {
      this.draggedItem = null;
      this.dropGapKey = null;
      this.dropTargetId = null;
      return;
    }

    const dragged = this.draggedItem!;
    this.draggedItem = null;
    this.dropGapKey = null;
    this.dropTargetId = null;

    dragged.parentActividadId = row.gapParentId;

    if (row.gapBeforeId !== null) {
      const beforeNode = this.items.find((i) => i.actividadId === row.gapBeforeId);
      if (beforeNode) {
        dragged.displayOrder = beforeNode.displayOrder - 0.5;
      } else {
        dragged.displayOrder = this.maxSiblingOrder(row.gapParentId, dragged) + 1;
      }
    } else {
      dragged.displayOrder = this.maxSiblingOrder(row.gapParentId, dragged) + 1;
    }

    this.renumberSiblings();
    this.recomputeTree();
  }

  onDragEnd(): void {
    this.draggedItem = null;
    this.dropTargetId = null;
    this.dropGapKey = null;
    this.stopAutoScroll();
  }

  // ── Auto-scroll ────────────────────────────────────────────────────────────

  onTreeContainerDragOver(event: DragEvent): void {
    if (!this.draggedItem) return;
    const el = this.treeScrollRef?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = event.clientY;
    let direction = 0;
    if (y < rect.top + this.EDGE_SIZE) direction = -1;
    else if (y > rect.bottom - this.EDGE_SIZE) direction = 1;

    if (direction !== this.scrollDirection) {
      this.scrollDirection = direction;
      if (direction === 0) this.stopAutoScroll();
      else this.startAutoScroll();
    }
  }

  private startAutoScroll(): void {
    if (this.scrollIntervalId !== null) return;
    this.scrollIntervalId = window.setInterval(() => {
      const el = this.treeScrollRef?.nativeElement;
      if (!el || this.scrollDirection === 0 || !this.draggedItem) {
        this.stopAutoScroll();
        return;
      }
      const before = el.scrollTop;
      el.scrollTop = before + this.scrollDirection * this.SCROLL_STEP;
      if (el.scrollTop === before) this.stopAutoScroll();
    }, 16);
  }

  private stopAutoScroll(): void {
    if (this.scrollIntervalId !== null) {
      clearInterval(this.scrollIntervalId);
      this.scrollIntervalId = null;
    }
    this.scrollDirection = 0;
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  // ── Cálculos del árbol ────────────────────────────────────────────────────

  private maxSiblingOrder(parentId: number | null, exclude: FlatActividad): number {
    let max = 0;
    for (const i of this.items) {
      if (!i.checked) continue;
      if (i === exclude) continue;
      if (i.parentActividadId !== parentId) continue;
      if (i.displayOrder > max) max = i.displayOrder;
    }
    return max;
  }

  private renumberSiblings(): void {
    const groups = new Map<number | null, FlatActividad[]>();
    for (const item of this.items) {
      if (!item.checked) continue;
      const key = item.parentActividadId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    for (const [, siblings] of groups) {
      siblings.sort((a, b) => a.displayOrder - b.displayOrder);
      siblings.forEach((s, idx) => (s.displayOrder = idx + 1));
    }
  }

  private recomputeTree(): void {
    const result: TreeNode[] = [];
    const walk = (parentId: number | null, depth: number) => {
      const siblings = this.items
        .filter((i) => i.checked && i.parentActividadId === parentId)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      siblings.forEach((sib, idx) => {
        result.push({
          item: sib,
          depth,
          canUp: idx > 0,
          canDown: idx < siblings.length - 1,
          canIndent: idx > 0,
          canOutdent: parentId !== null,
        });
        walk(sib.actividadId, depth + 1);
      });
    };
    walk(null, 0);
    this.visibleTree = result;

    const rows: TreeRow[] = [];
    for (const node of result) {
      const gapKey = `${node.item.parentActividadId ?? 'r'}:${node.item.actividadId}`;
      rows.push({
        kind: 'gap',
        node: null,
        gapParentId: node.item.parentActividadId,
        gapBeforeId: node.item.actividadId,
        gapDepth: node.depth,
        gapKey,
      });
      rows.push({
        kind: 'node',
        node,
        gapParentId: null,
        gapBeforeId: null,
        gapDepth: 0,
        gapKey: '',
      });
    }
    rows.push({
      kind: 'gap',
      node: null,
      gapParentId: null,
      gapBeforeId: null,
      gapDepth: 0,
      gapKey: 'r:end',
    });
    this.visibleTreeRows = rows;
  }

  trackByRow(_: number, row: TreeRow): string {
    return row.kind === 'node' && row.node ? `n:${row.node.item.actividadId}` : `g:${row.gapKey}`;
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  save(): void {
    const checked = this.items.filter((i) => i.checked);
    if (checked.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Cronograma vacío',
        text: 'Selecciona al menos una actividad.',
        confirmButtonColor: '#2596be',
      });
      return;
    }

    // Validar fechas coherentes
    const invalida = checked.find(
      (i) => i.fechaInicio && i.fechaFin && i.fechaInicio > i.fechaFin,
    );
    if (invalida) {
      Swal.fire({
        icon: 'warning',
        title: 'Fechas inválidas',
        text: `En "${invalida.nombre}" la fecha de inicio es posterior a la fecha de fin.`,
        confirmButtonColor: '#2596be',
      });
      return;
    }

    const nodos = checked.map((item) => ({
      actividadId: item.actividadId,
      parentActividadId: item.parentActividadId,
      orden: item.displayOrder,
      fechaInicio: item.fechaInicio || null,
      fechaFin: item.fechaFin || null,
    }));

    this.saving = true;
    this.loaderService.show();
    this.cronogramaService.save(this.projectSubContractorId, { nodos }).subscribe({
      next: (res) => {
        this.loaderService.hide();
        this.saving = false;
        this.saved.emit();
        this.closeModal.emit();
        Swal.fire({ icon: 'success', title: res.message ?? 'Cronograma guardado', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.saving = false;
        this.errorService.handleError(err);
      },
    });
  }
}
