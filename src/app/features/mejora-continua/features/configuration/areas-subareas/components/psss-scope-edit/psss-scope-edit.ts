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
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../../core/services/error.service';
import {
  ScopeService,
  ScopeTemplateDTO,
  ScopeTemplateItemNodeDTO,
  ScopeItemDTO,
} from '../../../scope/scope.service';
import { CatalogService } from '../../../scope/catalog.service';
import Swal from 'sweetalert2';

// Entrada del catálogo (panel izquierdo). Cada catalog_item existe UNA sola vez
// aquí; el "checked" se deriva de si hay >=1 nodo en el árbol que lo referencia.
interface CatalogEntry {
  catalogItemId: number;
  catalogTypeName: string;
  description: string;
}

// Un nodo del árbol de relaciones (scope). Un mismo catalogItemId puede
// repetirse bajo padres distintos; cada repetición tiene su propio nodeId
// único (= scope_item_id real, o temporal negativo si es un nodo nuevo).
interface TemplateNode {
  nodeId: number;
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
  selector: 'app-psss-scope-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './psss-scope-edit.html',
  styleUrl: './psss-scope-edit.css',
})
export class PsssScopeEdit implements OnInit, OnDestroy {
  @Input() lessonAreaId!: number;
  @Input() entityName = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild('treeScroll') treeScrollRef?: ElementRef<HTMLElement>;

  // Panel izquierdo (catálogo)
  catalog: CatalogEntry[] = [];
  templates: ScopeTemplateDTO[] = [];
  searchTerm = '';
  selectedTemplateId: number | null = null;
  loading = true;
  filteredCatalog: CatalogEntry[] = [];

  // Panel derecho (árbol)
  treeNodes: TemplateNode[] = [];
  visibleTree: TreeNode[] = [];
  visibleTreeRows: TreeRow[] = [];

  draggedNode: TemplateNode | null = null;
  dropTargetNodeId: number | null = null;
  dropGapKey: string | null = null;

  // Contador para nodeIds temporales (nodos nuevos no guardados)
  private nextTempNodeId = -1;

  private scrollIntervalId: number | null = null;
  private scrollDirection = 0;
  private readonly EDGE_SIZE = 48;
  private readonly SCROLL_STEP = 12;

  constructor(
    private scopeService: ScopeService,
    private catalogService: CatalogService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    forkJoin({
      catalog: this.catalogService.getFullTree(),
      scope: this.scopeService.getScopeTree(this.lessonAreaId),
      templates: this.scopeService.getTemplates(),
    }).subscribe({
      next: ({ catalog, scope, templates }) => {
        this.catalog = catalog.map((c) => ({
          catalogItemId: c.catalogItemId,
          catalogTypeName: c.catalogTypeName,
          description: c.catalogItemDescription,
        }));
        this.templates = templates;

        // Aplanar el árbol del scope preservando IDs únicos por nodo.
        // (scope_item_id es único; catalog_item_id puede repetirse bajo
        // padres distintos.)
        this.treeNodes = this.flattenScopeTree(scope);

        this.recomputeFiltered();
        this.recomputeTree();
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private flattenScopeTree(items: ScopeItemDTO[]): TemplateNode[] {
    const out: TemplateNode[] = [];
    const walk = (list: ScopeItemDTO[]) => {
      for (const item of list) {
        out.push({
          nodeId: item.scopeItemId,
          parentNodeId: item.scopeItemParentId ?? null,
          catalogItemId: item.catalogItemId,
          catalogTypeName: item.catalogTypeName,
          description: item.catalogItemDescription,
          displayOrder: item.displayOrder,
        });
        if (item.children?.length) walk(item.children);
      }
    };
    walk(items);
    return out;
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

  selectTemplate(id: number | null): void {
    this.selectedTemplateId = id;
    this.recomputeFiltered();
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.recomputeFiltered();
  }

  private recomputeFiltered(): void {
    let list = this.catalog;
    if (this.selectedTemplateId !== null) {
      const tpl = this.templates.find((t) => t.scopeTemplateId === this.selectedTemplateId);
      if (tpl) {
        const tplIds = new Set(tpl.items.map((i) => i.catalogItemId));
        list = list.filter((c) => tplIds.has(c.catalogItemId));
      }
    }
    const term = this.searchTerm.trim().toLowerCase();
    if (term) list = list.filter((c) => c.description.toLowerCase().includes(term));
    this.filteredCatalog = list;
  }

  toggleAll(checked: boolean): void {
    if (checked) {
      // Si hay una plantilla seleccionada, copiar su estructura COMPLETA al
      // árbol del scope (preservando todos los duplicados). Esto es distinto a
      // iterar por filteredCatalog (que solo agregaría UNA posición por
      // catalog_item).
      if (this.selectedTemplateId !== null) {
        const tpl = this.templates.find((t) => t.scopeTemplateId === this.selectedTemplateId);
        if (tpl) this.copyTemplateToScope(tpl);
      } else {
        for (const c of this.filteredCatalog) {
          this.checkWithAncestors(c);
        }
      }
    } else {
      for (const c of this.filteredCatalog) {
        this.uncheckCatalog(c);
      }
    }
    this.renumberSiblings();
    this.recomputeTree();
  }

  /**
   * Replica la estructura completa de una plantilla en el árbol del scope.
   * Para cada nodo del template, busca un nodo equivalente en el scope (mismo
   * catalog_item bajo el mismo padre) y lo reutiliza si existe; si no, crea
   * uno nuevo. Esto preserva los duplicados de catalog_item bajo padres
   * distintos en la plantilla.
   */
  private copyTemplateToScope(tpl: ScopeTemplateDTO): void {
    const tplNodeToScopeNode = new Map<number, number>();
    let pending = [...tpl.items];
    let safety = pending.length + 5;

    while (pending.length > 0 && safety-- > 0) {
      const ready = pending.filter(
        (n) => !n.parentNodeId || tplNodeToScopeNode.has(n.parentNodeId),
      );
      if (ready.length === 0) break;

      for (const tplNode of ready) {
        const parentScopeNodeId = tplNode.parentNodeId
          ? tplNodeToScopeNode.get(tplNode.parentNodeId) ?? null
          : null;

        // Si ya existe un nodo del scope con el mismo catalog_item bajo el
        // mismo padre, reutilizarlo. Si no, crear uno nuevo.
        const existing = this.treeNodes.find(
          (n) => n.catalogItemId === tplNode.catalogItemId && n.parentNodeId === parentScopeNodeId,
        );

        if (existing) {
          tplNodeToScopeNode.set(tplNode.nodeId, existing.nodeId);
        } else {
          const catalogEntry = this.catalog.find((c) => c.catalogItemId === tplNode.catalogItemId);
          if (!catalogEntry) continue;
          const newNode = this.addNewNode(catalogEntry, parentScopeNodeId);
          tplNodeToScopeNode.set(tplNode.nodeId, newNode.nodeId);
        }
      }

      pending = pending.filter((n) => !tplNodeToScopeNode.has(n.nodeId));
    }
  }

  toggleCheck(c: CatalogEntry, checked: boolean): void {
    if (checked) {
      this.checkWithAncestors(c);
    } else {
      this.uncheckCatalog(c);
    }
    this.renumberSiblings();
    this.recomputeTree();
  }

  /**
   * Si el catalog_item no está en el árbol, lo agrega como un nuevo nodo. Si
   * hay una plantilla que lo contiene, lo posiciona dentro del árbol siguiendo
   * la cadena de ancestros de la plantilla (creando los ancestros como nodos
   * nuevos también, en caso falten). Si el catalog_item ya está en el árbol
   * (al menos una vez), no hace nada.
   */
  private checkWithAncestors(c: CatalogEntry): void {
    if (this.isCatalogChecked(c.catalogItemId)) return;

    const tpl = this.findTemplateFor(c.catalogItemId);

    // Sin plantilla con jerarquía → agregar como raíz
    if (!tpl) {
      this.addNewNode(c, null);
      return;
    }

    // Construir cadena raíz→hoja del ítem dentro de la plantilla.
    const tplByNodeId = new Map<number, ScopeTemplateItemNodeDTO>();
    const firstNodeByCat = new Map<number, ScopeTemplateItemNodeDTO>();
    tpl.items.forEach((ti) => {
      tplByNodeId.set(ti.nodeId, ti);
      if (!firstNodeByCat.has(ti.catalogItemId)) firstNodeByCat.set(ti.catalogItemId, ti);
    });

    const startNode = firstNodeByCat.get(c.catalogItemId);
    if (!startNode) {
      this.addNewNode(c, null);
      return;
    }

    const chain: number[] = [];
    let cursorNodeId: number | null = startNode.nodeId;
    let safety = 50;
    while (cursorNodeId !== null && safety-- > 0) {
      const node = tplByNodeId.get(cursorNodeId);
      if (!node) break;
      chain.push(node.catalogItemId);
      cursorNodeId = node.parentNodeId;
    }
    chain.reverse(); // raíz primero

    // Marcar siguiendo la cadena; cada paso reutiliza el primer nodo existente
    // con ese catalog_item bajo el padre que se está construyendo, o crea uno nuevo.
    let prevNodeId: number | null = null;
    for (const catId of chain) {
      const catalogEntry = this.catalog.find((x) => x.catalogItemId === catId);
      if (!catalogEntry) {
        // catalog_item de la plantilla pero no en el catálogo cargado — saltar
        continue;
      }

      // ¿Ya existe un nodo con ese catalog_item bajo este padre?
      const existing = this.treeNodes.find(
        (n) => n.catalogItemId === catId && n.parentNodeId === prevNodeId,
      );

      if (existing) {
        prevNodeId = existing.nodeId;
      } else {
        const newNode = this.addNewNode(catalogEntry, prevNodeId);
        prevNodeId = newNode.nodeId;
      }
    }
  }

  /** Agrega un nuevo nodo con un nodeId temporal y lo ubica al final de su nivel. */
  private addNewNode(c: CatalogEntry, parentNodeId: number | null): TemplateNode {
    const siblingsCount = this.treeNodes.filter((n) => n.parentNodeId === parentNodeId).length;
    const newNode: TemplateNode = {
      nodeId: this.nextTempNodeId--,
      parentNodeId,
      catalogItemId: c.catalogItemId,
      catalogTypeName: c.catalogTypeName,
      description: c.description,
      displayOrder: siblingsCount + 1,
    };
    this.treeNodes.push(newNode);
    return newNode;
  }

  /** Plantilla a usar como fuente de jerarquía: la seleccionada como filtro, o la primera que contenga el ítem. */
  private findTemplateFor(catalogItemId: number): ScopeTemplateDTO | null {
    if (this.selectedTemplateId !== null) {
      const tpl = this.templates.find((t) => t.scopeTemplateId === this.selectedTemplateId);
      if (tpl && tpl.items.some((i) => i.catalogItemId === catalogItemId)) return tpl;
    }
    for (const t of this.templates) {
      if (t.items.some((i) => i.catalogItemId === catalogItemId)) return t;
    }
    return null;
  }

  /** Quita del árbol TODAS las instancias del catalog_item + sus descendientes. */
  private uncheckCatalog(c: CatalogEntry): void {
    const toRemove = new Set<number>();
    for (const n of this.treeNodes) {
      if (n.catalogItemId === c.catalogItemId) {
        this.collectSubtreeIds(n.nodeId, toRemove);
      }
    }
    if (toRemove.size === 0) return;
    this.treeNodes = this.treeNodes.filter((n) => !toRemove.has(n.nodeId));
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

  trackByRow(_: number, row: TreeRow): string {
    return row.kind === 'node' && row.node ? `n:${row.node.item.nodeId}` : `g:${row.gapKey}`;
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
    node.displayOrder = parent.displayOrder + 0.5;
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

  isInDraggedSubtree(node: TemplateNode): boolean {
    if (!this.draggedNode) return false;
    if (node.nodeId === this.draggedNode.nodeId) return true;
    return this.isDescendantOf(node, this.draggedNode);
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

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

  canDropOnGap(row: TreeRow): boolean {
    const dragged = this.draggedNode;
    if (!dragged || row.kind !== 'gap') return false;
    if (row.gapBeforeId === dragged.nodeId) return false;
    if (row.gapParentId !== null) {
      if (row.gapParentId === dragged.nodeId) return false;
      const newParent = this.treeNodes.find((n) => n.nodeId === row.gapParentId);
      if (newParent && this.isDescendantOf(newParent, dragged)) return false;
    }
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
    if (this.dropTargetNodeId === target.nodeId) this.dropTargetNodeId = null;
  }

  onDrop(target: TemplateNode, event: DragEvent): void {
    event.preventDefault();
    const dragged = this.draggedNode;
    this.draggedNode = null;
    this.dropTargetNodeId = null;
    this.dropGapKey = null;
    this.stopAutoScroll();
    if (!dragged) return;
    if (dragged.nodeId === target.nodeId) return;
    if (this.isDescendantOf(target, dragged)) return;
    if (dragged.parentNodeId === target.nodeId) return;

    dragged.parentNodeId = target.nodeId;
    const newSiblings = this.treeNodes.filter(
      (n) => n.parentNodeId === target.nodeId && n !== dragged,
    );
    dragged.displayOrder = newSiblings.length + 1;
    this.renumberSiblings();
    this.recomputeTree();
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
    if (this.dropGapKey === row.gapKey) this.dropGapKey = null;
  }

  onDropGap(row: TreeRow, event: DragEvent): void {
    event.preventDefault();
    if (row.kind !== 'gap') return;
    if (!this.canDropOnGap(row)) {
      this.draggedNode = null;
      this.dropGapKey = null;
      this.dropTargetNodeId = null;
      this.stopAutoScroll();
      return;
    }

    const dragged = this.draggedNode!;
    this.draggedNode = null;
    this.dropGapKey = null;
    this.dropTargetNodeId = null;
    this.stopAutoScroll();

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

  onDragEnd(): void {
    this.draggedNode = null;
    this.dropTargetNodeId = null;
    this.dropGapKey = null;
    this.stopAutoScroll();
  }

  // ── Auto-scroll ────────────────────────────────────────────────────────────

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

  // ── Guardar ────────────────────────────────────────────────────────────────

  save(): void {
    const items = this.treeNodes.map((n) => ({
      nodeId: n.nodeId,
      parentNodeId: n.parentNodeId,
      catalogItemId: n.catalogItemId,
      displayOrder: n.displayOrder,
    }));

    this.loaderService.show();
    this.scopeService.upsertScope({ lessonAreaId: this.lessonAreaId, items }).subscribe({
      next: () => {
        this.loaderService.hide();
        this.saved.emit();
        this.closeModal.emit();
        Swal.fire({ title: 'Relaciones actualizadas', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
