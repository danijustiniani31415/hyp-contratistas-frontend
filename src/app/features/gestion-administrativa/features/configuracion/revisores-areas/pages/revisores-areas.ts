import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RevisoresAreasService } from '../services/revisores-areas.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { Roles } from '../../../../../../core/constants/roles';
import {
  AreaProyectoRevisoresDTO,
  AreaRevisorAsignadoDTO,
  AreaRevisorItemDTO,
  AreaRevisorOptionDTO,
  ProyectoOptionDTO,
} from '../dtos/areaRevisor.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../../../shared/directives/abril-bulk-action.directive';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { CONFIGURACION_TABS } from '../../../../../configuracion/shared/configuracion-tabs';
import { DEFAULT_PAGE_SIZE } from '../../../../../../shared/constants/pagination';
import { RevisoresAreasDetalle } from '../components/detalle/detalle';
import { RevisoresAreasEditar } from '../components/editar/editar';

@Component({
  standalone: true,
  selector: 'app-revisores-areas',
  imports: [
    CommonModule,
    SearchSelect,
    SearchInput,
    Paginator,
    TitleCasePipe,
    AbrilBulkActionDirective,
    FilterModal,
    FilterTriggerButton,
    AbrilPageHeaderComponent,
    RevisoresAreasDetalle,
    RevisoresAreasEditar,
  ],
  templateUrl: './revisores-areas.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class RevisoresAreas implements OnInit {
  readonly tabs = CONFIGURACION_TABS;

  /** area_type.area_type_name de las filas que son gerencia (raíz de su rama). */
  private readonly TIPO_GERENCIA = 'Área de Gerencia';

  rows: AreaRevisorItemDTO[] = [];
  options: AreaRevisorOptionDTO[] = [];
  /** Todos los proyectos activos (para armar las subfilas de las áreas filtradas por proyecto). */
  proyectos: ProyectoOptionDTO[] = [];

  searchText = '';
  /** Filtro por revisor asignado: workerId del revisor o null = todos. */
  revisorFilter: number | null = null;
  /** Filtro por área padre (gerencia): nombre del padre o null = todas. */
  parentFilter: string | null = null;

  filtrosAbiertos = false;

  currentPage = 1;
  readonly pageSize = DEFAULT_PAGE_SIZE;

  /** Área con el modal de detalle abierto. null = cerrado. */
  detalleDe: AreaRevisorItemDTO | null = null;
  /** Área con el modal de edición abierto. null = cerrado. */
  editando: AreaRevisorItemDTO | null = null;
  /** Contexto de proyecto de los modales (null = alcance de área). */
  scopeProjectId: number | null = null;
  scopeProjectName: string | undefined;
  scopeRevisores: AreaRevisorAsignadoDTO[] | undefined;

  /**
   * Quién configura esta pantalla: el ADMINISTRADOR DE SOLICITUD DE SALIDAS y el
   * USUARIO DE GTH. Ambos ven todas las áreas y pueden editarlas (revisores y el
   * flag "filtrar por proyecto") — ver y editar van juntos, igual que en el
   * backend. Los Jefe/Coordinador/Gerente solo ven su área, de lectura (el
   * backend filtra y no les manda las opciones del selector), y el resto no ve
   * ninguna.
   */
  readonly puedeGestionar: boolean;

  constructor(
    private service: RevisoresAreasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    authService: AuthService,
  ) {
    this.puedeGestionar =
      authService.hasRole(Roles.ADMINISTRADOR_SOLICITUD_SALIDAS) ||
      authService.hasRole(Roles.USUARIO_GTH);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getInitialData().subscribe({
      next: (data) => {
        this.rows = data.areas;
        this.options = data.options;
        this.proyectos = data.proyectos ?? [];
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Modales ───────────────────────────────────────────────────────────

  openDetalle(item: AreaRevisorItemDTO): void {
    this.clearScope();
    this.detalleDe = item;
  }

  openEdit(item: AreaRevisorItemDTO): void {
    this.clearScope();
    this.editando = item;
  }

  /** Abre el detalle de un proyecto dentro de un área filtrada por proyecto. */
  openDetalleProyecto(item: AreaRevisorItemDTO, proj: AreaProyectoRevisoresDTO): void {
    this.scopeProjectId = proj.projectId;
    this.scopeProjectName = proj.projectName;
    this.scopeRevisores = proj.revisores;
    this.detalleDe = item;
  }

  /** Abre la edición de un proyecto dentro de un área filtrada por proyecto. */
  openEditProyecto(item: AreaRevisorItemDTO, proj: AreaProyectoRevisoresDTO): void {
    this.scopeProjectId = proj.projectId;
    this.scopeProjectName = proj.projectName;
    this.scopeRevisores = proj.revisores;
    this.editando = item;
  }

  private clearScope(): void {
    this.scopeProjectId = null;
    this.scopeProjectName = undefined;
    this.scopeRevisores = undefined;
  }

  closeModales(): void {
    this.detalleDe = null;
    this.editando = null;
    this.clearScope();
  }

  onSaved(): void {
    // Recargar para refrescar los revisores del área editada.
    this.load();
  }

  // ── Filtrar por proyecto ──────────────────────────────────────────────

  toggleFiltroProyecto(item: AreaRevisorItemDTO): void {
    const nuevo = !item.filtraPorProyecto;
    this.loaderService.show();
    this.service.setFiltroProyecto(item.areaScopeId, { filtraPorProyecto: nuevo }).subscribe({
      next: () => {
        item.filtraPorProyecto = nuevo;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Subfilas de proyecto de un área filtrada: un proyecto por cada proyecto activo, con sus revisores. */
  proyectosDeArea(item: AreaRevisorItemDTO): AreaProyectoRevisoresDTO[] {
    const asignados = new Map<number, AreaProyectoRevisoresDTO>();
    for (const p of item.proyectos ?? []) asignados.set(p.projectId, p);
    return this.proyectos.map(
      (p) =>
        asignados.get(p.projectId) ?? { projectId: p.projectId, projectName: p.projectName, revisores: [] },
    );
  }

  /**
   * true si la fila es un "Área de Gerencia": no tiene área padre y sus revisores son
   * el respaldo de todas las áreas estándar que cuelgan de ella.
   */
  esGerencia(item: AreaRevisorItemDTO): boolean {
    return item.areaTypeName === this.TIPO_GERENCIA;
  }

  // ── Celda "Revisores" ─────────────────────────────────────────────────

  /** Revisores ordenados por prioridad. */
  revisoresOrdenados(revisores: AreaRevisorAsignadoDTO[]): AreaRevisorAsignadoDTO[] {
    return [...(revisores ?? [])].sort((a, b) => a.ordenPrioridad - b.ordenPrioridad);
  }

  /** Primer revisor activo (el que recibe las solicitudes hoy). */
  revisorPrincipal(revisores: AreaRevisorAsignadoDTO[]): AreaRevisorAsignadoDTO | undefined {
    return this.revisoresOrdenados(revisores).find((r) => r.active);
  }

  // ── Filtros ───────────────────────────────────────────────────────────

  get filteredRows(): AreaRevisorItemDTO[] {
    return this.rows.filter((r) => {
      const matchesName =
        !this.searchText.trim() ||
        SearchInput.matches(r.areaName ?? '', this.searchText) ||
        (r.revisores ?? []).some((rev) => SearchInput.matches(rev.revisorFullName ?? '', this.searchText));
      const matchesRevisor =
        this.revisorFilter == null ||
        (r.revisores ?? []).some((rev) => rev.revisorWorkerId === this.revisorFilter);
      const matchesParent = this.parentFilter == null || r.parentName === this.parentFilter;
      return matchesName && matchesRevisor && matchesParent;
    });
  }

  /** Áreas padre (gerencias) de las áreas listadas (opciones del filtro). */
  get parentFilterOptions(): { name: string }[] {
    const seen = new Set<string>();
    for (const r of this.rows) {
      if (r.parentName) seen.add(r.parentName);
    }
    return [...seen].sort((a, b) => a.localeCompare(b)).map((name) => ({ name }));
  }

  /** Revisores que aparecen asignados en la lista (opciones del filtro). */
  get revisorFilterOptions(): AreaRevisorOptionDTO[] {
    const seen = new Map<number, AreaRevisorOptionDTO>();
    for (const r of this.rows) {
      for (const rev of r.revisores ?? []) {
        if (!seen.has(rev.revisorWorkerId)) {
          seen.set(rev.revisorWorkerId, {
            workerId: rev.revisorWorkerId,
            fullName: rev.revisorFullName,
            email: rev.revisorEmail,
          });
        }
      }
    }
    return [...seen.values()].sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.searchText.trim()) n++;
    if (this.revisorFilter !== null) n++;
    if (this.parentFilter !== null) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.searchText = '';
    this.revisorFilter = null;
    this.parentFilter = null;
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  // ── Paginación ────────────────────────────────────────────────────────

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  get pagedRows(): AreaRevisorItemDTO[] {
    const page = Math.min(this.currentPage, this.totalPages);
    return this.filteredRows.slice((page - 1) * this.pageSize, page * this.pageSize);
  }

  changePage(page: number): void {
    this.currentPage = page;
  }
}
