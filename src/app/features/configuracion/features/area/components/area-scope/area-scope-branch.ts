import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AreaItemService } from '../../services/area-item.service';
import { AreaScopeService } from '../../../../shared/services/area-scope.service';
import { AreaScopeBranchNodeDto } from '../../../../shared/dtos/areaScope.model';

interface FlatArea {
  areaItemId: number;
  areaTypeName: string;
  name: string;
  checked: boolean;
  parentAreaItemId: number | null;
  displayOrder: number;
}

interface TreeNode {
  item: FlatArea;
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

@Component({
  selector: 'app-area-scope-branch',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './area-scope-branch.html',
})
export class AreaScopeBranch implements OnInit, OnDestroy {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild('treeScroll') treeScrollRef?: ElementRef<HTMLElement>;

  private scrollIntervalId: number | null = null;
  private scrollDirection = 0;
  private readonly EDGE_SIZE = 48;
  private readonly SCROLL_STEP = 12;

  items: FlatArea[] = [];
  searchTerm = '';
  selectedTypeName: string | null = null;
  loading = true;

  filteredItems: FlatArea[] = [];
  visibleTree: TreeNode[] = [];
  visibleTreeRows: TreeRow[] = [];

  draggedItem: FlatArea | null = null;
  dropTargetId: number | null = null;
  dropGapKey: string | null = null;

  constructor(
    private areaItemService: AreaItemService,
    private areaScopeService: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.areaItemService.getSimple().subscribe({
      next: (data) => {
        // Necesitamos areaTypeName, así que pedimos paged con pageSize alto
        this.areaItemService.getPaged({ page: 1, pageSize: 10000, active: true }).subscribe({
          next: (paged) => {
            this.items = paged.data.map((a) => ({
              areaItemId: a.areaItemId,
              areaTypeName: a.areaTypeName,
              name: a.areaItemName,
              checked: false,
              parentAreaItemId: null,
              displayOrder: 0,
            }));
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
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Catálogo (izq) ─────────────────────────────────────────────────────────

  get typeNames(): string[] {
    const all = [...new Set(this.items.map((i) => i.areaTypeName))];
    // Orden explícito: Gerencia → Estándar. Otros tipos van al final.
    const customOrder = ['Área de Gerencia', 'Área Estándar'];
    const ordered = customOrder.filter((n) => all.includes(n));
    const rest = all.filter((n) => !customOrder.includes(n)).sort();
    return [...ordered, ...rest];
  }

  get checkedCount(): number {
    return this.items.filter((i) => i.checked).length;
  }

  get totalCount(): number {
    return this.items.length;
  }

  selectTypeName(name: string | null): void {
    this.selectedTypeName = name;
    this.recomputeFiltered();
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.recomputeFiltered();
  }

  private recomputeFiltered(): void {
    let list = this.items;
    if (this.selectedTypeName) {
      list = list.filter((i) => i.areaTypeName === this.selectedTypeName);
    }
    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter((i) => i.name.toLowerCase().includes(term));
    this.filteredItems = list;
  }

  toggleAll(checked: boolean): void {
    this.filteredItems.forEach((i) => this.setChecked(i, checked, false));
    this.renumberSiblings();
    this.recomputeTree();
  }

  toggleCheck(item: FlatArea, checked: boolean): void {
    this.setChecked(item, checked, true);
    this.recomputeTree();
  }

  private setChecked(item: FlatArea, checked: boolean, renumber: boolean): void {
    if (item.checked === checked) return;
    if (checked) {
      item.checked = true;
      item.parentAreaItemId = null;
      const rootsCount = this.items.filter(
        (i) => i.checked && i !== item && i.parentAreaItemId === null,
      ).length;
      item.displayOrder = rootsCount + 1;
    } else {
      const newParentId = item.parentAreaItemId;
      for (const child of this.items) {
        if (child.checked && child.parentAreaItemId === item.areaItemId) {
          child.parentAreaItemId = newParentId;
        }
      }
      item.checked = false;
      item.parentAreaItemId = null;
      item.displayOrder = 0;
    }
    if (renumber) this.renumberSiblings();
  }

  trackByItemId(_: number, item: FlatArea): number {
    return item.areaItemId;
  }

  // ── Árbol (der) ────────────────────────────────────────────────────────────

  trackByNode(_: number, node: TreeNode): number {
    return node.item.areaItemId;
  }

  private getSiblings(item: FlatArea): FlatArea[] {
    return this.items
      .filter((i) => i.checked && i.parentAreaItemId === item.parentAreaItemId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  moveUp(item: FlatArea): void {
    const siblings = this.getSiblings(item);
    const idx = siblings.indexOf(item);
    if (idx <= 0) return;
    const prev = siblings[idx - 1];
    [item.displayOrder, prev.displayOrder] = [prev.displayOrder, item.displayOrder];
    this.recomputeTree();
  }

  moveDown(item: FlatArea): void {
    const siblings = this.getSiblings(item);
    const idx = siblings.indexOf(item);
    if (idx === -1 || idx >= siblings.length - 1) return;
    const next = siblings[idx + 1];
    [item.displayOrder, next.displayOrder] = [next.displayOrder, item.displayOrder];
    this.recomputeTree();
  }

  indent(item: FlatArea): void {
    const siblings = this.getSiblings(item);
    const idx = siblings.indexOf(item);
    if (idx <= 0) return;
    const newParent = siblings[idx - 1];
    item.parentAreaItemId = newParent.areaItemId;
    const newSiblings = this.items.filter(
      (i) => i.checked && i.parentAreaItemId === newParent.areaItemId && i !== item,
    );
    item.displayOrder = newSiblings.length + 1;
    this.renumberSiblings();
    this.recomputeTree();
  }

  outdent(item: FlatArea): void {
    if (item.parentAreaItemId === null) return;
    const parent = this.items.find((i) => i.areaItemId === item.parentAreaItemId);
    if (!parent) return;
    item.parentAreaItemId = parent.parentAreaItemId;
    item.displayOrder = parent.displayOrder + 0.5;
    this.renumberSiblings();
    this.recomputeTree();
  }

  removeFromTree(item: FlatArea): void {
    this.setChecked(item, false, true);
    this.recomputeTree();
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  private isDescendantOf(item: FlatArea, ancestor: FlatArea): boolean {
    let currentParentId: number | null = item.parentAreaItemId;
    let safety = 200;
    while (currentParentId !== null && safety-- > 0) {
      if (currentParentId === ancestor.areaItemId) return true;
      const parent = this.items.find((i) => i.areaItemId === currentParentId);
      currentParentId = parent?.parentAreaItemId ?? null;
    }
    return false;
  }

  canDropOn(target: FlatArea): boolean {
    const dragged = this.draggedItem;
    if (!dragged) return false;
    if (dragged.areaItemId === target.areaItemId) return false;
    if (this.isDescendantOf(target, dragged)) return false;
    return true;
  }

  onDragStart(item: FlatArea, event: DragEvent): void {
    this.draggedItem = item;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(item.areaItemId));
    }
  }

  onDragOver(target: FlatArea, event: DragEvent): void {
    if (!this.canDropOn(target)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.dropTargetId !== target.areaItemId) {
      this.dropTargetId = target.areaItemId;
      this.dropGapKey = null;
    }
  }

  onDragLeave(target: FlatArea): void {
    if (this.dropTargetId === target.areaItemId) {
      this.dropTargetId = null;
    }
  }

  onDrop(target: FlatArea, event: DragEvent): void {
    event.preventDefault();
    const dragged = this.draggedItem;
    this.draggedItem = null;
    this.dropTargetId = null;
    if (!dragged) return;
    if (dragged.areaItemId === target.areaItemId) return;
    if (this.isDescendantOf(target, dragged)) return;
    if (dragged.parentAreaItemId === target.areaItemId) return;

    dragged.parentAreaItemId = target.areaItemId;
    const newSiblings = this.items.filter(
      (i) => i.checked && i.parentAreaItemId === target.areaItemId && i !== dragged,
    );
    dragged.displayOrder = newSiblings.length + 1;
    this.renumberSiblings();
    this.recomputeTree();
  }

  isInDraggedSubtree(item: FlatArea): boolean {
    if (!this.draggedItem) return false;
    if (item.areaItemId === this.draggedItem.areaItemId) return true;
    return this.isDescendantOf(item, this.draggedItem);
  }

  canDropOnGap(row: TreeRow): boolean {
    const dragged = this.draggedItem;
    if (!dragged || row.kind !== 'gap') return false;
    if (row.gapBeforeId === dragged.areaItemId) return false;
    if (row.gapParentId !== null) {
      if (row.gapParentId === dragged.areaItemId) return false;
      const newParent = this.items.find((i) => i.areaItemId === row.gapParentId);
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

    dragged.parentAreaItemId = row.gapParentId;

    if (row.gapBeforeId !== null) {
      const beforeNode = this.items.find((i) => i.areaItemId === row.gapBeforeId);
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

  private maxSiblingOrder(parentId: number | null, exclude: FlatArea): number {
    let max = 0;
    for (const i of this.items) {
      if (!i.checked) continue;
      if (i === exclude) continue;
      if (i.parentAreaItemId !== parentId) continue;
      if (i.displayOrder > max) max = i.displayOrder;
    }
    return max;
  }

  private renumberSiblings(): void {
    const groups = new Map<number | null, FlatArea[]>();
    for (const item of this.items) {
      if (!item.checked) continue;
      const key = item.parentAreaItemId;
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
        .filter((i) => i.checked && i.parentAreaItemId === parentId)
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
        walk(sib.areaItemId, depth + 1);
      });
    };
    walk(null, 0);
    this.visibleTree = result;

    const rows: TreeRow[] = [];
    for (const node of result) {
      const gapKey = `${node.item.parentAreaItemId ?? 'r'}:${node.item.areaItemId}`;
      rows.push({
        kind: 'gap',
        node: null,
        gapParentId: node.item.parentAreaItemId,
        gapBeforeId: node.item.areaItemId,
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
    return row.kind === 'node' && row.node
      ? `n:${row.node.item.areaItemId}`
      : `g:${row.gapKey}`;
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  save(): void {
    const checked = this.items.filter((i) => i.checked);
    if (checked.length === 0) {
      Swal.fire({ icon: 'error', title: 'Selección vacía', text: 'Selecciona al menos un área.' });
      return;
    }

    // Construir nodos para el backend usando areaItemId como tempId (es único dentro del modal)
    const nodes: AreaScopeBranchNodeDto[] = checked.map((item) => ({
      tempId: item.areaItemId,
      areaItemId: item.areaItemId,
      parentTempId: item.parentAreaItemId,
      displayOrder: item.displayOrder,
    }));

    this.loaderService.show();
    this.areaScopeService.createBranch({ nodes }).subscribe({
      next: () => {
        this.loaderService.hide();
        this.saved.emit();
        this.closeModal.emit();
        Swal.fire({ title: 'Relación creada', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
