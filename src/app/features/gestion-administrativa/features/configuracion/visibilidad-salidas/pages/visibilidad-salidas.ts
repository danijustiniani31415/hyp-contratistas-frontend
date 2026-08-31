import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { VisibilidadSalidasService } from '../services/visibilidad-salidas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { VisibilidadAreaNodeDTO, VisibilidadWorkerItemDTO } from '../dtos/visibilidadSalida.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { VisibilidadModal } from '../components/visibilidad-modal/visibilidad-modal';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { DEFAULT_PAGE_SIZE } from '../../../../../../shared/constants/pagination';

/** Nodo del árbol de áreas para el desplegable en cascada del filtro. */
interface AreaCascadeNode {
  areaScopeId: number;
  name: string;
  children: AreaCascadeNode[];
}

@Component({
  standalone: true,
  selector: 'app-visibilidad-salidas',
  imports: [
    CommonModule,
    FormsModule,
    SearchSelect,
    SearchInput,
    Paginator,
    VisibilidadModal,
    TitleCasePipe,
    AbrilBulkActionDirective,
    FilterModal,
  ],
  templateUrl: './visibilidad-salidas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class VisibilidadSalidas implements OnInit {
  rows: VisibilidadWorkerItemDTO[] = [];
  searchText = '';
  categoriaFilter: number | null = null;
  currentPage = 1;
  readonly pageSize = DEFAULT_PAGE_SIZE;

  // ── Filtro de área en cascada (incluye todos los tipos de área, gerencia incluida) ──
  /** Niveles visibles del desplegable en cascada: [0] = raíces, [1] = hijos del nodo elegido, … */
  areaLevels: AreaCascadeNode[][] = [];
  /** Nodo elegido por nivel (undefined = "Todas" en ese nivel). */
  selectedAreaNodes: (AreaCascadeNode | undefined)[] = [];
  /** area_scope_id del subárbol del nodo seleccionado, aplicados al pulsar "Buscar". */
  private appliedAreaScopeIds = new Set<number>();

  /** Trabajador en edición (modal abierto). null = modal cerrado. */
  editing: VisibilidadWorkerItemDTO | null = null;

  /** Modal de filtros (mismo patrón que Gestión de Salidas). */
  filtrosAbiertos = false;

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim())                n++;
    if (this.categoriaFilter != null)           n++;
    if (this.selectedAreaNodes.some((x) => x))  n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.categoriaFilter = null;
    this.areaLevels = this.areaLevels.length ? [this.areaLevels[0]] : this.areaLevels;
    this.selectedAreaNodes = this.selectedAreaNodes.length ? [undefined] : this.selectedAreaNodes;
    this.appliedAreaScopeIds = new Set();
    this.onFilterChange();
  }

  constructor(
    private service: VisibilidadSalidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getInitialData().subscribe({
      next: (data) => {
        this.rows = data.workers;
        this.buildAreaCascade(data.areaTree);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Filtro de área en cascada ────────────────────────────────────────────

  /** Arma el árbol a partir de la lista plana de nodos area_scope y deja listo el 1er nivel. */
  private buildAreaCascade(nodes: VisibilidadAreaNodeDTO[]): void {
    const byId = new Map<number, AreaCascadeNode>();
    for (const n of nodes) {
      byId.set(n.areaScopeId, { areaScopeId: n.areaScopeId, name: n.areaItemName, children: [] });
    }
    const roots: AreaCascadeNode[] = [];
    const sorted = [...nodes].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.areaItemName.localeCompare(b.areaItemName),
    );
    for (const n of sorted) {
      const node = byId.get(n.areaScopeId)!;
      const parent = n.areaScopeParentId != null ? byId.get(n.areaScopeParentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    this.areaLevels = roots.length ? [roots] : [];
    this.selectedAreaNodes = roots.length ? [undefined] : [];
  }

  /** Al elegir un nodo: recorta los niveles inferiores y, si tiene hijos, agrega el siguiente desplegable. */
  onAreaNodeChange(levelIndex: number, selectedId: number | undefined): void {
    const selected =
      selectedId != null ? this.areaLevels[levelIndex]?.find((n) => n.areaScopeId === selectedId) : undefined;

    this.selectedAreaNodes[levelIndex] = selected;
    this.areaLevels = this.areaLevels.slice(0, levelIndex + 1);
    this.selectedAreaNodes = this.selectedAreaNodes.slice(0, levelIndex + 1);

    if (selected?.children?.length) {
      this.areaLevels.push(selected.children);
      this.selectedAreaNodes.push(undefined);
    }

    this.onBuscar();
  }

  /** area_scope_id del nodo seleccionado más profundo + todos sus descendientes. */
  private currentAreaScopeIds(): number[] {
    let deepest: AreaCascadeNode | undefined;
    for (let i = this.selectedAreaNodes.length - 1; i >= 0; i--) {
      if (this.selectedAreaNodes[i]) {
        deepest = this.selectedAreaNodes[i];
        break;
      }
    }
    return deepest ? this.collectScopeIds(deepest) : [];
  }

  private collectScopeIds(node: AreaCascadeNode): number[] {
    const ids = [node.areaScopeId];
    for (const c of node.children) ids.push(...this.collectScopeIds(c));
    return ids;
  }

  /** Aplica el área seleccionada (nodo actual + subáreas) al filtro de la tabla. */
  onBuscar(): void {
    this.appliedAreaScopeIds = new Set(this.currentAreaScopeIds());
    this.currentPage = 1;
  }

  /** True si hay algún filtro activo (para distinguir "sin resultados" de "sin datos"). */
  get hasActiveFilter(): boolean {
    return !!this.searchText.trim() || this.categoriaFilter != null || this.appliedAreaScopeIds.size > 0;
  }

  openEdit(item: VisibilidadWorkerItemDTO): void {
    this.editing = item;
  }

  onSaved(): void {
    // Recargar para refrescar el conteo de áreas asignadas.
    this.load();
  }

  get filteredRows(): VisibilidadWorkerItemDTO[] {
    return this.rows.filter((r) => {
      const matchesName = !this.searchText.trim() || SearchInput.matches(r.fullName ?? '', this.searchText);
      const matchesCategoria = this.categoriaFilter == null || r.categoryId === this.categoriaFilter;
      const matchesArea =
        this.appliedAreaScopeIds.size === 0 ||
        (r.areaScopeId != null && this.appliedAreaScopeIds.has(r.areaScopeId));
      return matchesName && matchesCategoria && matchesArea;
    });
  }

  get categoriaFilterOptions(): { id: number; name: string }[] {
    const seen = new Map<number, string>();
    for (const r of this.rows) {
      if (r.categoryId != null && r.category && !seen.has(r.categoryId)) seen.set(r.categoryId, r.category);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  get pagedRows(): VisibilidadWorkerItemDTO[] {
    const page = Math.min(this.currentPage, this.totalPages);
    return this.filteredRows.slice((page - 1) * this.pageSize, page * this.pageSize);
  }

  changePage(page: number): void {
    this.currentPage = page;
  }
}
