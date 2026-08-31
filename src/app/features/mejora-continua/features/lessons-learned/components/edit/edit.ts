import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { FileSelector, SelectedFile } from '../../../../../../shared/components/file-selector/file-selector';
import { ImagePreview } from '../../../../../../shared/components/image-preview/image-preview';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LeccionesAprendidasService } from '../../services/lecciones-aprendidas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { environment } from '../../../../../../../environments/environment';
import { LessonFiltersDTO } from '../../dtos/lessonFilters.model';
import { ScopeItemDTO } from '../../dtos/scope-item.model';
import { LessonImageDTO } from '../../dtos/lessonDetail.model';
import {
  LessonAreaConfigItemDto,
  LessonAreaSegmentDto,
} from '../../../configuration/lesson-areas/dtos/lesson-area.dto';

/** Nodo del árbol de áreas (igual que en create). */
interface AreaTreeNode {
  id: number;
  name: string;
  typeName: string;
  lessonAreaId?: number;
  children: AreaTreeNode[];
}

@Component({
  selector: 'app-edit-lesson',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, FileSelector, ImagePreview, SearchSelect],
  templateUrl: './edit.html',
})
export class EditLesson implements OnInit {
  @Input() lessonId!: number;
  @Input() filtersData!: LessonFiltersDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  apiUrl = environment.apiUrl;

  // Ubicación
  projectId = 0;
  lessonAreaId = 0;
  /** Obra / Staff / Oficina Central (workers_obra_oficina_staff). */
  obraOficinaStaffId: number | null = null;

  // Árbol de áreas (cascade)
  private areaTreeRoots: AreaTreeNode[] = [];
  areaLevels: AreaTreeNode[][] = [];
  selectedAreaNodes: (AreaTreeNode | undefined)[] = [];
  private areaNodeSeq = 0;

  // Clasificación (scope)
  scopeLevels: ScopeItemDTO[][] = [];
  selectedScopeItems: (ScopeItemDTO | undefined)[] = [];
  /** catalog_item_id de la lección a precargar la primera vez que se cargue el scope. */
  private pendingCatalogItemId?: number;

  // Texto
  problemDescription = '';
  reasonDescription = '';
  lessonDescription = '';
  impactDescription = '';

  // Imágenes existentes (con opción de quitar) + nuevas
  opportunityExisting: LessonImageDTO[] = [];
  improvementExisting: LessonImageDTO[] = [];
  removedImageIds: number[] = [];
  opportunityPreviews: string[] = [];
  opportunityFiles: File[] = [];
  improvementPreviews: string[] = [];
  improvementFiles: File[] = [];

  constructor(
    private lessonService: LeccionesAprendidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  private getStandardColor(): string {
    return getComputedStyle(document.documentElement).getPropertyValue('--color-abril-standard').trim() || '#0F6E56';
  }

  ngOnInit(): void {
    this.loaderService.show();
    this.lessonService.getLessonAreasWithScope().subscribe({
      next: (data: LessonAreaConfigItemDto[]) => {
        this.areaTreeRoots = this.buildAreaTree(data.filter((d) => d.lessonAreaId != null));
        this.areaLevels = this.areaTreeRoots.length ? [this.areaTreeRoots] : [];
        this.selectedAreaNodes = this.areaTreeRoots.length ? [undefined] : [];
        this.loadLesson();
      },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  private loadLesson(): void {
    this.lessonService.getById(this.lessonId).subscribe({
      next: (lesson) => {
        this.projectId = lesson.projectId ?? 0;
        this.obraOficinaStaffId = lesson.obraOficinaStaffId ?? null;
        this.problemDescription = lesson.problemDescription ?? '';
        this.reasonDescription = lesson.reasonDescription ?? '';
        this.lessonDescription = lesson.lessonDescription ?? '';
        this.impactDescription = lesson.impactDescription ?? '';
        this.opportunityExisting = (lesson.images ?? []).filter((i) => i.imageTypeDescription === 'OPORTUNIDAD');
        this.improvementExisting = (lesson.images ?? []).filter((i) => i.imageTypeDescription === 'MEJORA');

        if (lesson.lessonAreaId) {
          this.prefillArea(lesson.lessonAreaId);
          this.pendingCatalogItemId = lesson.catalogItemId ?? undefined;
          this.loadScopeData();
        } else {
          this.loaderService.hide();
        }
      },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  // ── Árbol de áreas (idéntico a create) ──────────────────────────────────────

  private buildAreaTree(items: LessonAreaConfigItemDto[]): AreaTreeNode[] {
    this.areaNodeSeq = 0;

    const stripGerencia = (path: LessonAreaSegmentDto[]): LessonAreaSegmentDto[] => {
      let start = 0;
      while (
        start < path.length &&
        (path[start].areaTypeName ?? '').trim() === 'Área de Gerencia'
      ) {
        start++;
      }
      return path.slice(start);
    };

    const keyOf = (path: LessonAreaSegmentDto[]): string =>
      path.map((s) => `${s.areaTypeName} ${s.areaItemName}`).join('');

    // Paths (sin 'Área de Gerencia') de los nodos marcados como independientes.
    const independentKeys = new Set(
      items.filter((i) => i.includeAsIndependent).map((i) => keyOf(stripGerencia(i.path))),
    );

    const independentRoots: AreaTreeNode[] = [];
    const cascadeRoots: AreaTreeNode[] = [];

    for (const item of items) {
      const trimmed = stripGerencia(item.path);
      if (trimmed.length === 0) continue;

      // Independiente → opción de primer nivel (hoja), va directo a sus plantillas.
      if (item.includeAsIndependent) {
        const leaf = trimmed[trimmed.length - 1];
        independentRoots.push({
          id: ++this.areaNodeSeq,
          name: leaf.areaItemName,
          typeName: leaf.areaTypeName,
          lessonAreaId: item.lessonAreaId!,
          children: [],
        });
        continue;
      }

      // Si algún ancestro es independiente, este nodo queda oculto (la independencia
      // corta el subárbol). Revisamos cada prefijo propio del path.
      let underIndependent = false;
      for (let k = 1; k < trimmed.length; k++) {
        if (independentKeys.has(keyOf(trimmed.slice(0, k)))) {
          underIndependent = true;
          break;
        }
      }
      if (underIndependent) continue;

      // Construcción normal en cascada.
      let level = cascadeRoots;
      let node: AreaTreeNode | undefined;
      for (const seg of trimmed) {
        node = level.find((n) => n.name === seg.areaItemName && n.typeName === seg.areaTypeName);
        if (!node) {
          node = { id: ++this.areaNodeSeq, name: seg.areaItemName, typeName: seg.areaTypeName, children: [] };
          level.push(node);
        }
        level = node.children;
      }
      // El último segmento es la hoja: lleva el lessonAreaId.
      if (node) node.lessonAreaId = item.lessonAreaId!;
    }

    // Independientes primero (priorizados), luego la cascada normal.
    return [...independentRoots, ...cascadeRoots];
  }

  private findAreaPath(nodes: AreaTreeNode[], targetLessonAreaId: number): AreaTreeNode[] | null {
    for (const node of nodes) {
      if (node.lessonAreaId === targetLessonAreaId) return [node];
      if (node.children?.length) {
        const sub = this.findAreaPath(node.children, targetLessonAreaId);
        if (sub) return [node, ...sub];
      }
    }
    return null;
  }

  private prefillArea(targetLessonAreaId: number): void {
    const path = this.findAreaPath(this.areaTreeRoots, targetLessonAreaId);
    if (!path?.length) return;
    this.areaLevels = [];
    this.selectedAreaNodes = [];
    let levelOptions = this.areaTreeRoots;
    for (const node of path) {
      this.areaLevels.push(levelOptions);
      this.selectedAreaNodes.push(node);
      levelOptions = node.children;
    }
    this.lessonAreaId = targetLessonAreaId;
  }

  onAreaNodeChange(levelIndex: number, selectedId: number | undefined): void {
    const selected = selectedId ? this.areaLevels[levelIndex]?.find((n) => n.id === selectedId) : undefined;
    this.selectedAreaNodes[levelIndex] = selected;
    this.areaLevels = this.areaLevels.slice(0, levelIndex + 1);
    this.selectedAreaNodes = this.selectedAreaNodes.slice(0, levelIndex + 1);
    if (selected?.children?.length) {
      this.areaLevels.push(selected.children);
      this.selectedAreaNodes.push(undefined);
    }
    this.syncLessonAreaFromCascade();
  }

  private syncLessonAreaFromCascade(): void {
    const deepest = this.selectedAreaNodes.length ? this.selectedAreaNodes[this.selectedAreaNodes.length - 1] : undefined;
    const newId = deepest && !deepest.children.length && deepest.lessonAreaId ? deepest.lessonAreaId : 0;
    if (newId === this.lessonAreaId) return;
    this.lessonAreaId = newId;
    this.scopeLevels = [];
    this.selectedScopeItems = [];
    this.pendingCatalogItemId = undefined;
    if (newId) this.loadScopeData();
  }

  // ── Clasificación (scope) ───────────────────────────────────────────────────

  private loadScopeData(): void {
    if (!this.lessonAreaId) { this.loaderService.hide(); return; }
    this.loaderService.show();
    this.lessonService.getFiltersCreate(this.lessonAreaId).subscribe({
      next: (tree) => {
        const t = tree ?? [];
        if (this.pendingCatalogItemId && t.length) {
          this.prefillClassification(t, this.pendingCatalogItemId);
          this.pendingCatalogItemId = undefined;
        } else {
          this.scopeLevels = t.length ? [t] : [];
          this.selectedScopeItems = t.length ? [undefined] : [];
        }
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  private findScopePath(nodes: ScopeItemDTO[], target: number): ScopeItemDTO[] | null {
    for (const node of nodes) {
      if (node.children?.length) {
        const sub = this.findScopePath(node.children, target);
        if (sub) return [node, ...sub];
      }
    }
    for (const node of nodes) {
      if (node.catalogItemId === target) return [node];
    }
    return null;
  }

  private prefillClassification(tree: ScopeItemDTO[], targetCatalogItemId: number): void {
    const path = this.findScopePath(tree, targetCatalogItemId);
    if (!path?.length) {
      this.scopeLevels = tree.length ? [tree] : [];
      this.selectedScopeItems = tree.length ? [undefined] : [];
      return;
    }
    this.scopeLevels = [];
    this.selectedScopeItems = [];
    let levelOptions = tree;
    for (const node of path) {
      this.scopeLevels.push(levelOptions);
      this.selectedScopeItems.push(node);
      levelOptions = node.children ?? [];
    }
  }

  getLevelLabel(levelIndex: number): string {
    return this.scopeLevels[levelIndex]?.[0]?.catalogTypeName ?? `Nivel ${levelIndex + 1}`;
  }

  onScopeItemChange(levelIndex: number, selectedId: number | undefined): void {
    const selected = selectedId ? this.scopeLevels[levelIndex]?.find((i) => i.scopeItemId === selectedId) : undefined;
    this.selectedScopeItems[levelIndex] = selected;
    this.scopeLevels = this.scopeLevels.slice(0, levelIndex + 1);
    this.selectedScopeItems = this.selectedScopeItems.slice(0, levelIndex + 1);
    if (selected?.children?.length) {
      this.scopeLevels.push(selected.children);
      this.selectedScopeItems.push(undefined);
    }
  }

  get deepestSelectedCatalogItemId(): number | undefined {
    for (let i = this.selectedScopeItems.length - 1; i >= 0; i--) {
      if (this.selectedScopeItems[i]) return this.selectedScopeItems[i]!.catalogItemId;
    }
    return undefined;
  }

  isClassificationComplete(): boolean {
    if (this.scopeLevels.length === 0) return false;
    if (this.selectedScopeItems.length !== this.scopeLevels.length) return false;
    for (const sel of this.selectedScopeItems) if (!sel) return false;
    const deepest = this.selectedScopeItems[this.selectedScopeItems.length - 1];
    if (!deepest) return false;
    if (deepest.children && deepest.children.length > 0) return false;
    return true;
  }

  // ── Imágenes ─────────────────────────────────────────────────────────────────

  imageUrl(url: string): string {
    return url.startsWith('http') ? url : this.apiUrl + url;
  }

  removeExisting(image: LessonImageDTO, type: 'opportunity' | 'improvement'): void {
    this.removedImageIds.push(image.lessonImageId);
    if (type === 'opportunity')
      this.opportunityExisting = this.opportunityExisting.filter((i) => i.lessonImageId !== image.lessonImageId);
    else
      this.improvementExisting = this.improvementExisting.filter((i) => i.lessonImageId !== image.lessonImageId);
  }

  onFileSelected(image: SelectedFile, type: 'opportunity' | 'improvement'): void {
    if (type === 'opportunity') {
      this.opportunityFiles.push(image.file);
      this.opportunityPreviews.push(image.preview);
    } else {
      this.improvementFiles.push(image.file);
      this.improvementPreviews.push(image.preview);
    }
  }

  removeImage(index: number, type: 'opportunity' | 'improvement'): void {
    if (type === 'opportunity') {
      this.opportunityFiles.splice(index, 1);
      this.opportunityPreviews.splice(index, 1);
    } else {
      this.improvementFiles.splice(index, 1);
      this.improvementPreviews.splice(index, 1);
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  submit(): void {
    if (!this.projectId) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccionar proyecto' }); return; }
    if (!this.lessonAreaId) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Seleccionar área' }); return; }
    if (!this.isClassificationComplete()) {
      Swal.fire({ icon: 'error', title: 'Clasificación incompleta', text: 'Debes seleccionar una opción en cada desplegable de la sección Clasificación hasta llegar al último nivel disponible.' });
      return;
    }
    if (!this.problemDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese una descripcion' }); return; }
    if (!this.reasonDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese las causas' }); return; }
    if (!this.lessonDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese la leccion aprendida' }); return; }
    if (!this.impactDescription) { Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese el impacto' }); return; }

    const form = new FormData();
    form.append('ProjectId', String(this.projectId));
    form.append('LessonAreaId', String(this.lessonAreaId));
    const catalogItemId = this.deepestSelectedCatalogItemId;
    if (catalogItemId) form.append('CatalogItemId', String(catalogItemId));
    form.append('ProblemDescription', this.problemDescription);
    form.append('ReasonDescription', this.reasonDescription);
    form.append('LessonDescription', this.lessonDescription);
    form.append('ImpactDescription', this.impactDescription);
    this.removedImageIds.forEach((id) => form.append('RemovedImageIds', String(id)));
    this.opportunityFiles.forEach((f) => form.append('OpportunityImages', f));
    this.improvementFiles.forEach((f) => form.append('ImprovementImages', f));

    this.loaderService.show();
    this.lessonService.updateLesson(this.lessonId, form).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: 'Lección actualizada', text: 'Volvió a estado pendiente para revisión.', icon: 'success', confirmButtonColor: this.getStandardColor() });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }
}
