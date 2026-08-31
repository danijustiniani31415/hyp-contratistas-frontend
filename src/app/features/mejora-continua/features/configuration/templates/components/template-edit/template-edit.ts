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
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import { ScopeService, ScopeTemplateDTO } from '../../../scope/scope.service';
import { CatalogService } from '../../../scope/catalog.service';
import Swal from 'sweetalert2';

// Entrada del catálogo (panel izquierdo, solo lectura). Cada catalog_item
// existe UNA sola vez aquí. El "checked" se deriva de si hay >=1 nodo en el
// árbol que lo referencia.
interface CatalogEntry {
  catalogItemId: number;
  catalogTypeName: string;
  description: string;
}

// Un nodo del árbol de la plantilla. Un mismo catalogItemId puede repetirse
// bajo padres distintos; cada repetición es un TemplateNode con su propio
// nodeId único.
interface TemplateNode {
  nodeId: number; // id real (>0) o temporal (<0) para nodos nuevos
  parentNodeId: number | null;
  catalogItemId: number;
  catalogTypeName: string;
  description: string;
  displayOrder: number;
}

interface TreeNode {
  item: TemplateNode;
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
  selector: 'app-template-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './template-edit.html',
  styleUrl: './template-edit.css',
})
export class TemplateEdit implements OnInit, OnDestroy {
  @Input() template!: ScopeTemplateDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild('treeScroll') treeScrollRef?: ElementRef<HTMLElement>;

  private scrollIntervalId: number | null = null;
  private scrollDirection = 0;
  private readonly EDGE_SIZE = 48;
  private readonly SCROLL_STEP = 12;

  editName = '';

  // Panel izquierdo (catálogo)
  catalog: CatalogEntry[] = [];
  searchTerm = '';
  selectedTypeName: string | null = null;
  loading = true;
  filteredCatalog: CatalogEntry[] = [];

  // Panel derecho (árbol)
  treeNodes: TemplateNode[] = [];
  visibleTree: TreeNode[] = [];
  visibleTreeRows: TreeRow[] = [];

  // Drag & drop state
  draggedNode: TemplateNode | null = null;
  dropTargetNodeId: number | null = null;
  dropGapKey: string | null = null;

  // Contador para nodeIds temporales (nodos nuevos no guardados)
  private nextTempNodeId = -1;

  constructor(
    private scopeService: ScopeService,
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.editName = this.template.templateName;
    this.loaderService.show();
    this.catalogService.getFullTree().subscribe({
      next: (catalog) => {
        this.catalog = catalog.map((c) => ({
          catalogItemId: c.catalogItemId,
          catalogTypeName: c.catalogTypeName,
          description: c.catalogItemDescription,
        }));

        const catalogById = new Map(this.catalog.map((c) => [c.catalogItemId, c]));

        // Reconstruir treeNodes desde los items de la plantilla, preservando
        // duplicados — cada item tiene su propio nodeId único.
        this.treeNodes = this.template.items.map((i) => ({
          nodeId: i.nodeId,
          parentNodeId: i.parentNodeId,
          catalogItemId: i.catalogItemId,
          catalogTypeName: catalogById.get(i.catalogItemId)?.catalogTypeName ?? '',
          description: i.catalogItemDescription,
          displayOrder: i.displayOrder,
        }));

        this.recomputeFiltered();
        this.recomputeTree();
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Catálogo (izq) ─────────────────────────────────────────────────────────

  get typeNames(): string[] {
    return [...new Set(this.catalog.map((c) => c.catalogTypeName))].sort();
  }

  /** Cantidad de catalog_items distintos referenciados al menos una vez en el árbol. */
  get checkedCount(): number {
    return new Set(this.treeNodes.map((n) => n.catalogItemId)).size;
  }

  get totalCount(): number {
    return this.catalog.length;
  }

  isCatalogChecked(catalogItemId: number): boolean {
    return this.treeNodes.some((n) => n.catalogItemId === catalogItemId);
  }

  allFilteredChecked(): boolean {
    if (this.filteredCatalog.length === 0) return false;
    return this.filteredCatalog.every((c) => this.isCatalogChecked(c.catalogItemId));
  }

  someFilteredChecked(): boolean {
    return this.filteredCatalog.some((c) => this.isCatalogChecked(c.catalogItemId));
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
    let list = this.catalog;
    if (this.selectedTypeName) {
      list = list.filter((c) => c.catalogTypeName === this.selectedTypeName);
    }
    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter((c) => c.description.toLowerCase().includes(term));
    this.filteredCatalog = list;
  }

  toggleAll(checked: boolean): void {
    for (const c of this.filteredCatalog) {
      this.setCatalogChecked(c, checked);
    }
    this.renumberSiblings();
    this.recomputeTree();
  }

  toggleCheck(c: CatalogEntry, checked: boolean): void {
    this.setCatalogChecked(c, checked);
    this.renumberSiblings();
    this.recomputeTree();
  }

  /**
   * Toggle por catalog_item:
   *   • checked=true & no estaba en el árbol  → agrega UN nodo nuevo como raíz.
   *   • checked=false                          → elimina TODOS los nodos del árbol
   *                                              con ese catalogItemId y sus descendientes.
   *   • Si ya estaba en el estado pedido, no hace nada.
   */
  private setCatalogChecked(c: CatalogEntry, checked: boolean): void {
    const isCurrentlyChecked = this.isCatalogChecked(c.catalogItemId);
    if (isCurrentlyChecked === checked) return;

    if (checked) {
      const rootsCount = this.treeNodes.filter((n) => n.parentNodeId === null).length;
      this.treeNodes.push({
        nodeId: this.nextTempNodeId--,
        parentNodeId: null,
        catalogItemId: c.catalogItemId,
        catalogTypeName: c.catalogTypeName,
        description: c.description,
        displayOrder: rootsCount + 1,
      });
    } else {
      const toRemove = new Set<number>();
      for (const n of this.treeNodes) {
        if (n.catalogItemId === c.catalogItemId) {
          this.collectSubtreeIds(n.nodeId, toRemove);
        }
      }
      this.treeNodes = this.treeNodes.filter((n) => !toRemove.has(n.nodeId));
    }
  }

  private collectSubtreeIds(rootNodeId: number, acc: Set<number>): void {
    if (acc.has(rootNodeId)) return;
    acc.add(rootNodeId);
    for (const n of this.treeNodes) {
      if (n.parentNodeId === rootNodeId) this.collectSubtreeIds(n.nodeId, acc);
    }
  }

  trackByCatalogId(_: number, c: CatalogEntry): number {
    return c.catalogItemId;
  }

  // ── Árbol (der) ────────────────────────────────────────────────────────────

  trackByNode(_: number, node: TreeNode): number {
    return node.item.nodeId;
  }

  private getSiblings(node: TemplateNode): TemplateNode[] {
    return this.treeNodes
      .filter((n) => n.parentNodeId === node.parentNodeId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  moveUp(node: TemplateNode): void {
    const siblings = this.getSiblings(node);
    const idx = siblings.indexOf(node);
    if (idx <= 0) return;
    const prev = siblings[idx - 1];
    [node.displayOrder, prev.displayOrder] = [prev.displayOrder, node.displayOrder];
    this.recomputeTree();
  }

  moveDown(node: TemplateNode): void {
    const siblings = this.getSiblings(node);
    const idx = siblings.indexOf(node);
    if (idx === -1 || idx >= siblings.length - 1) return;
    const next = siblings[idx + 1];
    [node.displayOrder, next.displayOrder] = [next.displayOrder, node.displayOrder];
    this.recomputeTree();
  }

  indent(node: TemplateNode): void {
    const siblings = this.getSiblings(node);
    const idx = siblings.indexOf(node);
    if (idx <= 0) return;
    const newParent = siblings[idx - 1];
    node.parentNodeId = newParent.nodeId;
    const newSiblings = this.treeNodes.filter(
      (n) => n.parentNodeId === newParent.nodeId && n !== node,
    );
    node.displayOrder = newSiblings.length + 1;
    this.renumberSiblings();
    this.recomputeTree();
  }

  outdent(node: TemplateNode): void {
    if (node.parentNodeId === null) return;
    const parent = this.treeNodes.find((n) => n.nodeId === node.parentNodeId);
    if (!parent) return;
    node.parentNodeId = parent.parentNodeId;
    node.displayOrder = parent.displayOrder + 0.5; // posición justo después del padre
    this.renumberSiblings();
    this.recomputeTree();
  }

  removeFromTree(node: TemplateNode): void {
    const toRemove = new Set<number>();
    this.collectSubtreeIds(node.nodeId, toRemove);
    this.treeNodes = this.treeNodes.filter((n) => !toRemove.has(n.nodeId));
    this.renumberSiblings();
    this.recomputeTree();
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  private isDescendantOf(node: TemplateNode, ancestor: TemplateNode): boolean {
    let currentParentId: number | null = node.parentNodeId;
    let safety = 200;
    while (currentParentId !== null && safety-- > 0) {
      if (currentParentId === ancestor.nodeId) return true;
      const parent = this.treeNodes.find((n) => n.nodeId === currentParentId);
      currentParentId = parent?.parentNodeId ?? null;
    }
    return false;
  }

  canDropOn(target: TemplateNode): boolean {
    const dragged = this.draggedNode;
    if (!dragged) return false;
    if (dragged.nodeId === target.nodeId) return false;
    if (this.isDescendantOf(target, dragged)) return false;
    return true;
  }

  onDragStart(node: TemplateNode, event: DragEvent): void {
    this.draggedNode = node;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(node.nodeId));
    }
  }

  onDragOver(target: TemplateNode, event: DragEvent): void {
    if (!this.canDropOn(target)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this.dropTargetNodeId !== target.nodeId) {
      this.dropTargetNodeId = target.nodeId;
      this.dropGapKey = null;
    }
  }

  onDragLeave(target: TemplateNode): void {
    if (this.dropTargetNodeId === target.nodeId) {
      this.dropTargetNodeId = null;
    }
  }

  onDrop(target: TemplateNode, event: DragEvent): void {
    event.preventDefault();
    const dragged = this.draggedNode;
    this.draggedNode = null;
    this.dropTargetNodeId = null;
    if (!dragged) return;
    if (dragged.nodeId === target.nodeId) return;
    if (this.isDescendantOf(target, dragged)) return;
    if (dragged.parentNodeId === target.nodeId) return; // ya es hijo

    dragged.parentNodeId = target.nodeId;
    const newSiblings = this.treeNodes.filter(
      (n) => n.parentNodeId === target.nodeId && n !== dragged,
    );
    dragged.displayOrder = newSiblings.length + 1;
    this.renumberSiblings();
    this.recomputeTree();
  }

  onDragEnd(): void {
    this.draggedNode = null;
    this.dropTargetNodeId = null;
    this.dropGapKey = null;
    this.stopAutoScroll();
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  // ── Auto-scroll del árbol durante el drag ─────────────────────────────────

  onTreeContainerDragOver(event: DragEvent): void {
    if (!this.draggedNode) return;
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
      if (!el || this.scrollDirection === 0 || !this.draggedNode) {
        this.stopAutoScroll();
        return;
      }
      const before = el.scrollTop;
      el.scrollTop = before + this.scrollDirection * this.SCROLL_STEP;
      if (el.scrollTop === before) this.stopAutoScroll(); // tope alcanzado
    }, 16);
  }

  private stopAutoScroll(): void {
    if (this.scrollIntervalId !== null) {
      clearInterval(this.scrollIntervalId);
      this.scrollIntervalId = null;
    }
    this.scrollDirection = 0;
  }

  private maxSiblingOrder(parentId: number | null, exclude: TemplateNode): number {
    let max = 0;
    for (const n of this.treeNodes) {
      if (n === exclude) continue;
      if (n.parentNodeId !== parentId) continue;
      if (n.displayOrder > max) max = n.displayOrder;
    }
    return max;
  }

  private renumberSiblings(): void {
    const groups = new Map<number | null, TemplateNode[]>();
    for (const node of this.treeNodes) {
      const key = node.parentNodeId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(node);
    }
    for (const [, siblings] of groups) {
      siblings.sort((a, b) => a.displayOrder - b.displayOrder);
      siblings.forEach((s, idx) => (s.displayOrder = idx + 1));
    }
  }

  private recomputeTree(): void {
    const result: TreeNode[] = [];
    const walk = (parentId: number | null, depth: number) => {
      const siblings = this.treeNodes
        .filter((n) => n.parentNodeId === parentId)
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
        walk(sib.nodeId, depth + 1);
      });
    };
    walk(null, 0);
    this.visibleTree = result;

    // Intercalar gaps entre cada nodo + uno final
    const rows: TreeRow[] = [];
    for (const node of result) {
      const gapKey = `${node.item.parentNodeId ?? 'r'}:${node.item.nodeId}`;
      rows.push({
        kind: 'gap',
        node: null,
        gapParentId: node.item.parentNodeId,
        gapBeforeId: node.item.nodeId,
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
    return row.kind === 'node' && row.node ? `n:${row.node.item.nodeId}` : `g:${row.gapKey}`;
  }

  isInDraggedSubtree(node: TemplateNode): boolean {
    if (!this.draggedNode) return false;
    if (node.nodeId === this.draggedNode.nodeId) return true;
    return this.isDescendantOf(node, this.draggedNode);
  }

  canDropOnGap(row: TreeRow): boolean {
    const dragged = this.draggedNode;
    if (!dragged || row.kind !== 'gap') return false;
    // No-op: soltar justo antes de sí mismo
    if (row.gapBeforeId === dragged.nodeId) return false;
    // Evitar ciclos: no soltar dentro del propio nodo arrastrado o un descendiente
    if (row.gapParentId !== null) {
      if (row.gapParentId === dragged.nodeId) return false;
      const newParent = this.treeNodes.find((n) => n.nodeId === row.gapParentId);
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
      this.dropTargetNodeId = null;
    }
  }

  onDragLeaveGap(row: TreeRow): void {
    if (this.dropGapKey === row.gapKey) {
      this.dropGapKey = null;
    }
  }

  onDropGap(row: TreeRow, event: DragEvent): void {
    event.preventDefault();
    if (row.kind !== 'gap') return;

    // Validar ANTES de limpiar draggedNode (canDropOnGap lo lee)
    if (!this.canDropOnGap(row)) {
      this.draggedNode = null;
      this.dropGapKey = null;
      this.dropTargetNodeId = null;
      return;
    }

    const dragged = this.draggedNode!;
    this.draggedNode = null;
    this.dropGapKey = null;
    this.dropTargetNodeId = null;

    dragged.parentNodeId = row.gapParentId;

    if (row.gapBeforeId !== null) {
      const beforeNode = this.treeNodes.find((n) => n.nodeId === row.gapBeforeId);
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

  // ── Guardar ────────────────────────────────────────────────────────────────

  save(): void {
    if (!this.editName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'El nombre no puede estar vacío.' });
      return;
    }

    const items = this.treeNodes.map((n) => ({
      nodeId: n.nodeId,
      parentNodeId: n.parentNodeId,
      catalogItemId: n.catalogItemId,
      catalogItemDescription: n.description,
      displayOrder: n.displayOrder,
    }));

    this.loaderService.show();
    this.scopeService
      .updateTemplate({
        scopeTemplateId: this.template.scopeTemplateId,
        templateName: this.editName.trim(),
        items,
      })
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.saved.emit();
          this.closeModal.emit();
          Swal.fire({ title: 'Plantilla actualizada', icon: 'success', draggable: true });
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }
}
