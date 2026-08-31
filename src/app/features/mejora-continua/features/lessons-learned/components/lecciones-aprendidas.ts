import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FormsModule } from '@angular/forms';
import { LeccionesAprendidasService } from '../services/lecciones-aprendidas.service';
import { LessonListDTO } from '../dtos/lessonList.model';
import { LessonFiltersDTO, CatalogFilterGroupDTO, CatalogFilterItemDTO } from '../dtos/lessonFilters.model';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { CreateLesson } from './create/create';
import { DetailLesson } from './detail/detail';
import { EditLesson } from './edit/edit';
import { LessonList } from './list/list';
import { LessonCard } from './card/card';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { ViewToggle } from '../../../../../shared/components/view-toggle/view-toggle';
import { ViewToggleMode } from '../../../../../shared/components/view-toggle/view-toggle.model';
import { environment } from '../../../../../../environments/environment';
import { formatPeriodLabel as periodMonthYear } from '../../../../../shared/pipes/period-label.pipe';
import { jwtDecode } from 'jwt-decode';
import Swal from 'sweetalert2';
import { GUIA_LECCIONES_APRENDIDAS } from '../../../../../shared/constants/mejora-continua-guia';
import {
  LessonAreaConfigItemDto,
  LessonAreaSegmentDto,
} from '../../configuration/lesson-areas/dtos/lesson-area.dto';

import { MEJORA_CONTINUA_TABS } from '../../../shared/mejora-continua-tabs';
/** Nodo del árbol de áreas para el filtro de área (misma lógica que el formulario de creación). */
interface AreaTreeNode {
  id: number;
  name: string;
  typeName: string;
  lessonAreaId?: number;
  children: AreaTreeNode[];
}

@Component({
  selector: 'app-lecciones-aprendidas',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, CreateLesson, DetailLesson, EditLesson, LessonList, LessonCard, SearchSelect, ViewToggle, AbrilPageHeaderComponent],
  templateUrl: './lecciones-aprendidas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class LeccionesAprendidas implements OnInit {
  readonly tabs = MEJORA_CONTINUA_TABS;
  anioActual = new Date().getFullYear();
  currentUserId = 0;
  apiUrl = environment.apiUrl;

  /** Enlace al video-guía mostrado en la cabecera ("Click para ver guía"). */
  readonly guia = GUIA_LECCIONES_APRENDIDAS;

  // Selector de área en cascada (misma lógica que el formulario de creación).
  private areaTreeRoots: AreaTreeNode[] = [];
  areaLevels: AreaTreeNode[][] = [];
  selectedAreaNodes: (AreaTreeNode | undefined)[] = [];
  private areaNodeSeq = 0;
  /** lesson_area_ids efectivos: subárbol del nodo donde se detuvo el usuario. */
  selectedAreaIds: number[] = [];

  // List data
  lessons: LessonListDTO[] = [];
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;

  // Filters raw
  filtersData: LessonFiltersDTO = {
    projects: [], areas: [], periods: [], users: [], reviewers: [], categories: [],
    obraOficinaStaff: [], defaultObraOficinaStaffId: null,
  };

  // Computed SearchSelect options (with null "Todos" prepended)
  projectOptions: any[] = [];
  userOptions: any[] = [];
  reviewerOptions: any[] = [];
  periodOptions: any[] = [];
  /**
   * Opciones del filtro Obra / Oficina. Reemplaza al segundo nivel ("Subárea") de la
   * cascada de áreas: ese nivel salía de los nodos de tipo "Área Obra_Oficina", que
   * ya no existen — ahora el dato vive en workers.obra_oficina_staff_id.
   */
  obraOficinaOptions: any[] = [];
  /**
   * Por cada catalog_type, las opciones del dropdown (con el "Todos" inicial).
   * Indexado por `catalogTypeId` para conservar el orden de catalog_type.
   */
  categoryOptions: { group: CatalogFilterGroupDTO; options: any[] }[] = [];

  filtersTable = {
    projectId: null as number | null,
    periodDate: null as string | null,
    userId: null as number | null,
    /** Revisor (jefe asignado al autor) — workerId o null = todos. */
    reviewerWorkerId: null as number | null,
    /** Selección por catalog_type_id → catalog_item_id (o null para "Todos"). */
    catalogSelections: {} as Record<number, number | null>,
    /** Obra / Staff / Oficina Central (workers_obra_oficina_staff) o null = todos. */
    obraOficinaStaffId: null as number | null,
    /** Estado de aprobación: null=Todos | PENDIENTE | APROBADA | RECHAZADA. */
    approvalStatus: null as string | null,
    /** Solo lecciones pendientes de mi revisión (subordinados). */
    onlyMyPendingReview: false,
    page: 1 as number | null,
  };
  showFilters = false;

  // Opciones del filtro de estado de aprobación.
  approvalStatusOptions = [
    { value: null, label: 'Todos los estados' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'APROBADA', label: 'Aprobada' },
    { value: 'RECHAZADA', label: 'Rechazada' },
  ];

  // View mode
  viewMode = 'table';
  viewModes: ViewToggleMode[] = [
    {
      value: 'table',
      label: 'Tabla',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>`,
    },
    {
      value: 'card',
      label: 'Tarjetas',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    },
  ];

  // Ventana de subida: durante la revisión de la jefatura (últimos 2 días hábiles
  // del mes + fines de semana/feriados intermedios) no se permite registrar.
  canUpload = true;
  uploadBlockedMessage = '';

  // Modals
  showCreateModal = false;
  selectedLessonId: number | null = null;
  selectedLessonTab: 'general' | 'images' = 'general';
  editLessonId: number | null = null;

  constructor(
    private leccionesAprendidasService: LeccionesAprendidasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      const decoded: any = jwtDecode(token);
      this.currentUserId = Number(decoded.sub);
    }
    this.loadInitial();
    this.loadAreaTree();
    this.loadUploadWindow();
  }

  /** Consulta si hoy se pueden registrar lecciones (ventana de revisión de jefatura). */
  private loadUploadWindow(): void {
    this.leccionesAprendidasService.getUploadWindow().subscribe({
      next: (w) => {
        this.canUpload = w.canUpload;
        this.uploadBlockedMessage = w.message ?? '';
      },
      // Si falla la consulta, no bloqueamos: el backend igual valida al crear.
      error: () => {
        this.canUpload = true;
        this.uploadBlockedMessage = '';
      },
    });
  }

  // ── Selector de área en cascada (filtro de la lista) ─────────────────────────

  private loadAreaTree(): void {
    this.leccionesAprendidasService.getLessonAreasForFilter().subscribe({
      next: (data: LessonAreaConfigItemDto[]) => {
        this.areaTreeRoots = this.buildAreaTree(data.filter((d) => d.lessonAreaId != null));
        this.areaLevels = this.areaTreeRoots.length ? [this.areaTreeRoots] : [];
        this.selectedAreaNodes = this.areaTreeRoots.length ? [undefined] : [];
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  /** Igual que el formulario de creación: independientes como hojas de 1er nivel, resto en cascada. */
  private buildAreaTree(items: LessonAreaConfigItemDto[]): AreaTreeNode[] {
    this.areaNodeSeq = 0;

    const stripGerencia = (path: LessonAreaSegmentDto[]): LessonAreaSegmentDto[] => {
      let start = 0;
      while (start < path.length && (path[start].areaTypeName ?? '').trim() === 'Área de Gerencia') start++;
      return path.slice(start);
    };
    const keyOf = (path: LessonAreaSegmentDto[]): string =>
      path.map((s) => `${s.areaTypeName} ${s.areaItemName}`).join('');

    const independentKeys = new Set(
      items.filter((i) => i.includeAsIndependent).map((i) => keyOf(stripGerencia(i.path))),
    );

    const independentRoots: AreaTreeNode[] = [];
    const cascadeRoots: AreaTreeNode[] = [];

    for (const item of items) {
      const trimmed = stripGerencia(item.path);
      if (trimmed.length === 0) continue;

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

      let underIndependent = false;
      for (let k = 1; k < trimmed.length; k++) {
        if (independentKeys.has(keyOf(trimmed.slice(0, k)))) { underIndependent = true; break; }
      }
      if (underIndependent) continue;

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
      if (node) node.lessonAreaId = item.lessonAreaId!;
    }

    return [...independentRoots, ...cascadeRoots];
  }

  getAreaLevelLabel(levelIndex: number): string {
    return this.areaLevels[levelIndex]?.[0]?.typeName ?? 'Área';
  }

  onAreaNodeChange(levelIndex: number, selectedId: number | undefined): void {
    const selected = selectedId
      ? this.areaLevels[levelIndex]?.find((n) => n.id === selectedId)
      : undefined;

    this.selectedAreaNodes[levelIndex] = selected;
    this.areaLevels = this.areaLevels.slice(0, levelIndex + 1);
    this.selectedAreaNodes = this.selectedAreaNodes.slice(0, levelIndex + 1);

    if (selected?.children?.length) {
      this.areaLevels.push(selected.children);
      this.selectedAreaNodes.push(undefined);
    }

    this.syncSelectedAreaIds();
  }

  /**
   * Filtro de área: toma el nodo más profundo SELECCIONADO y junta todos los
   * lesson_area_id de su subárbol. Si te detienes en un padre (p. ej. Unidad de
   * Proyectos) → incluye todas sus subáreas; si bajas a una hoja → solo esa.
   */
  private syncSelectedAreaIds(): void {
    let deepest: AreaTreeNode | undefined;
    for (let i = this.selectedAreaNodes.length - 1; i >= 0; i--) {
      if (this.selectedAreaNodes[i]) { deepest = this.selectedAreaNodes[i]; break; }
    }
    this.selectedAreaIds = deepest ? this.collectAreaIds(deepest) : [];
  }

  private collectAreaIds(node: AreaTreeNode): number[] {
    const ids: number[] = [];
    if (node.lessonAreaId) ids.push(node.lessonAreaId);
    for (const c of node.children) ids.push(...this.collectAreaIds(c));
    return ids;
  }

  private loadInitial(): void {
    this.loaderService.show();
    this.leccionesAprendidasService.getLessonsPagedWithFilters(this.buildQueryFilters()).subscribe({
      next: ({ paged, filters }) => {
        this.lessons = paged.data;
        this.filtersData = filters;
        this.currentPage = paged.page;
        this.totalPages = paged.totalPages;
        this.totalRecords = paged.totalRecords;
        this.buildFilterOptions(filters);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private buildFilterOptions(fd: LessonFiltersDTO): void {
    this.projectOptions = [{ projectId: null, projectDescription: 'Todos los proyectos' }, ...fd.projects];
    this.userOptions = [{ userId: null, fullName: 'Todos los usuarios' }, ...fd.users];
    this.reviewerOptions = [{ workerId: null, fullName: 'Todos los revisores' }, ...(fd.reviewers ?? [])];
    this.obraOficinaOptions = [
      { obraOficinaStaffId: null, name: 'Todos' },
      ...(fd.obraOficinaStaff ?? []),
    ];
    this.periodOptions = [
      { periodDate: null, periodLabel: 'Todos los periodos' },
      ...fd.periods.map(p => ({
        periodDate: this.formatPeriodValue(p.periodDate),
        periodLabel: this.formatPeriodLabel(p.periodDate),
      })),
    ];

    // Dropdowns dinámicos por catalog_type. Inicializa la selección a null
    // (Todos) si todavía no había un valor en filtersTable.catalogSelections.
    this.categoryOptions = (fd.categories ?? []).map((group) => ({
      group,
      options: [
        { catalogItemId: null, catalogItemDescription: `Todos los ${group.catalogTypeName.toLowerCase()}` },
        ...group.items,
      ],
    }));
    for (const { group } of this.categoryOptions) {
      if (!(group.catalogTypeId in this.filtersTable.catalogSelections)) {
        this.filtersTable.catalogSelections[group.catalogTypeId] = null;
      }
    }
  }

  /** Setter usado por los dropdowns dinámicos del template. */
  onCatalogSelectionChange(catalogTypeId: number, value: number | null): void {
    this.filtersTable.catalogSelections[catalogTypeId] = value;
  }

  /** Valor actual de un dropdown dinámico (para que el template no haga indexación rara). */
  getCatalogSelection(catalogTypeId: number): number | null {
    return this.filtersTable.catalogSelections[catalogTypeId] ?? null;
  }

  /** Convierte el state a query params para el service (catalogItemIds como CSV). */
  private buildQueryFilters(): any {
    const selected = Object.values(this.filtersTable.catalogSelections)
      .filter((v): v is number => v != null);
    return {
      projectId: this.filtersTable.projectId,
      lessonAreaIds: this.selectedAreaIds.length ? this.selectedAreaIds.join(',') : null,
      obraOficinaStaffId: this.filtersTable.obraOficinaStaffId,
      periodDate: this.filtersTable.periodDate,
      userId: this.filtersTable.userId,
      reviewerWorkerId: this.filtersTable.reviewerWorkerId,
      catalogItemIds: selected.length > 0 ? selected.join(',') : null,
      approvalStatus: this.filtersTable.approvalStatus,
      onlyMyPendingReview: this.filtersTable.onlyMyPendingReview ? true : null,
      page: this.filtersTable.page,
    };
  }

  /** Atajo: alterna "pendientes de mi revisión" y recarga. */
  toggleMyPendingReview(): void {
    this.filtersTable.onlyMyPendingReview = !this.filtersTable.onlyMyPendingReview;
    this.loadLessons(1);
  }

  private formatPeriodValue(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private formatPeriodLabel(date: Date): string {
    return periodMonthYear(date);
  }

  loadLessons(page: number = 1): void {
    this.filtersTable.page = page;
    this.loaderService.show();
    this.leccionesAprendidasService.getLessonsUsingFilters(this.buildQueryFilters()).subscribe({
      next: (data) => {
        this.lessons = data.data;
        this.currentPage = data.page;
        this.totalPages = data.totalPages;
        this.totalRecords = data.totalRecords;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onSearch(): void {
    this.loadLessons(1);
  }

  downloadExcel(): void {
    this.loaderService.show();
    this.leccionesAprendidasService.getExcel(this.buildQueryFilters()).subscribe({
      next: (blob: Blob) => {
        const file = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Lecciones_Aprendidas.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  /**
   * Abre el modal de creación. Durante la ventana de revisión de la jefatura el
   * botón está deshabilitado; como defensa extra, si llegara a invocarse muestra
   * el motivo y no abre el modal.
   */
  onNuevoRegistro(): void {
    if (!this.canUpload) {
      Swal.fire({
        icon: 'info',
        title: 'Ventana de revisión',
        text: this.uploadBlockedMessage,
      });
      return;
    }
    this.showCreateModal = true;
  }

  openCreateModal(event: MouseEvent): void {
    event.stopPropagation();
    this.showCreateModal = true;
  }

  onViewDetail(ev: { lessonId: number; tab: 'general' | 'images' }): void {
    this.selectedLessonId = ev.lessonId;
    this.selectedLessonTab = ev.tab;
  }

  onCardClick(lessonId: number): void {
    this.selectedLessonId = lessonId;
    this.selectedLessonTab = 'general';
  }

  /** Desde el detalle: abrir el modal de edición (solo el autor). */
  onEditLesson(lessonId: number): void {
    this.selectedLessonId = null;
    this.editLessonId = lessonId;
  }

  onEditSaved(): void {
    this.editLessonId = null;
    this.loadLessons(this.currentPage || 1);
  }

  /** Tras aprobar/rechazar en el detalle, recargar la lista. */
  onReviewed(): void {
    this.loadLessons(this.currentPage || 1);
  }
}
