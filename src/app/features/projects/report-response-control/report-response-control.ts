import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReportResponseControlCreate } from './report-response-control-create/report-response-control-create';
import { List } from './list/list';
import { ReportCards } from './report-cards/report-cards';
import { ResidentReportIncidenceDTO } from '../../../core/dtos/reportResponseControl/residentReportIncidence.model';
import { ProjectSimpleDTO } from '../../../core/dtos/project/projectSimple.model';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { AuthService } from '../../../core/services/auth.service';
import { Roles } from '../../../core/constants/roles';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { RespondReportModal } from './list/respond-report-modal/respond-report-modal';
import { ReportViewModal } from './list/report-view-modal/report-view-modal';
import { ResidentReportIncidenceService } from '../../../core/services/residentReportIncidence.service';
import { ProjectResidentService } from '../../../core/services/projectResident.service';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { TitleCasePipe } from '../../../shared/pipes/title-case.pipe';

import { PROJECTS_TABS } from '../shared/projects-tabs';

type ViewMode = 'cards' | 'table';

@Component({
  selector: 'app-report-response-control',
  imports: [
    CommonModule,
    ReportResponseControlCreate,
    List,
    ReportCards,
    Paginator,
    AbrilPageHeaderComponent,
    FabButton,
    FilterTriggerButton,
    FilterModal,
    SearchSelect,
    RespondReportModal,
    ReportViewModal,
    TitleCasePipe,
  ],
  templateUrl: './report-response-control.html',
  styleUrl: './report-response-control.css',
})
export class ReportResponseControl implements OnInit {
  readonly tabs = PROJECTS_TABS;
  readonly Roles = Roles;
  anioActual = new Date().getFullYear();

  // ── Vista (tarjetas / tabla) ─────────────────────────────────────────
  currentView: ViewMode = 'table';

  // ── Datos + estado de carga ──────────────────────────────────────────
  reports: ResidentReportIncidenceDTO[] = [];
  loading = false;

  // ── Paginación (server-side) ─────────────────────────────────────────
  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  // ── Filtros (server-side, ambos opcionales) ──────────────────────────
  filtros: { projectId: number | null; stateId: number | null } = {
    projectId: null,
    stateId: null,
  };

  filtrosAbiertos = false;

  /** Opciones de proyecto para el filtro (carga perezosa al abrir filtros; para RESIDENTE
   *  se resuelven antes, ver initResidente()). */
  projectOptions: ProjectSimpleDTO[] = [];
  private projectsLoaded = false;

  /** RESIDENTE con 0 proyectos asignados: no se llama GetPaged, se muestra un estado
   *  vacío específico ("sin proyectos"), distinto del "sin resultados" genérico. */
  sinProyectosAsignados = false;

  /** Oculta el filtro de Proyecto (trigger + chip) cuando no tiene sentido mostrarlo:
   *  RESIDENTE con exactamente 1 proyecto asignado (nada para elegir, el backend ya
   *  filtra el GetPaged por ese único proyecto) o con 0 (no hay nada que filtrar). */
  mostrarFiltroProyecto = true;

  /**
   * Descripción del proyecto filtrado, para el chip que se muestra sobre la lista.
   * Se guarda al elegir la opción (y no se deriva de projectOptions en cada render)
   * porque las opciones se cargan perezosamente.
   */
  filtroProyectoLabel: string | null = null;

  /**
   * Estado: LEVANTADO → stateId 5, NO LEVANTADO → stateId 6 (confirmado por backend).
   * Ya no vive en el modal de filtros: es una pestaña siempre visible sobre la lista,
   * porque es el corte que el usuario cambia todo el tiempo.
   */
  readonly estadoTabs: { value: number | null; label: string }[] = [
    { value: null, label: 'Todos' },
    { value: 6, label: 'No levantado' },
    { value: 5, label: 'Levantado' },
  ];

  // ── Modales ──────────────────────────────────────────────────────────
  showCreateModal = false;
  showResponseModal = false;
  showReportViewModal = false;
  selectedReportIncidenceId = 0;
  selectedIncidence: ResidentReportIncidenceDTO | null = null;

  constructor(
    public authService: AuthService,
    private reportService: ResidentReportIncidenceService,
    private projectResidentService: ProjectResidentService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    // 1 acción = 1 HTTP: en el init solo se carga la lista. Los proyectos del filtro
    // se piden recién cuando el usuario abre el panel de filtros (ver abrirFiltros()).
    // Excepción documentada para RESIDENTE: ver initResidente().
    if (this.authService.hasRole(Roles.RESIDENTE)) {
      this.initResidente();
    } else {
      this.load();
    }
  }

  /**
   * Para RESIDENTE, los proyectos asignados (assigned-projects) determinan tanto si
   * corresponde mostrar el filtro de Proyecto como si corresponde llamar al GetPaged
   * (0 proyectos → ni se llama). Es una excepción documentada a "1 acción = 1 HTTP"
   * (memoria arch-1-accion-1-http), en la misma categoría que ProjectsDashboard.ngOnInit:
   * la vista inicial necesita dos recursos que hoy no vienen combinados en un único
   * endpoint backend.
   */
  private initResidente(): void {
    // loading=true cubre las DOS llamadas encadenadas (assigned-projects + load): si solo
    // se seteara dentro de load(), el skeleton no aparecería durante la espera de
    // assigned-projects y se vería el empty-state genérico ("sin resultados") antes que el
    // skeleton real — un parpadeo visual incorrecto.
    this.loading = true;
    this.loaderService.show();
    this.reportService.getAssignedProjects().subscribe({
      next: (projects) => {
        this.loaderService.hide();
        this.projectOptions = projects;
        this.projectsLoaded = true;

        if (projects.length === 0) {
          this.loading = false;
          this.sinProyectosAsignados = true;
          this.mostrarFiltroProyecto = false;
          return;
        }

        // 1 proyecto: el backend ya filtra el GetPaged por ese único proyecto sin
        // necesidad de enviar projectId, así que el filtro no tiene sentido mostrarlo.
        this.mostrarFiltroProyecto = projects.length >= 2;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Carga de datos ───────────────────────────────────────────────────
  load(page: number = 1): void {
    this.loading = true;
    this.loaderService.show();
    this.reportService.getReportsPaged(page, this.filtros.projectId, this.filtros.stateId).subscribe({
      next: (res) => {
        this.reports = res.data;
        this.currentPage = res.page;
        this.totalPages = res.totalPages;
        this.pageSize = res.pageSize;
        this.totalRecords = res.totalRecords;
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Cualquier cambio de filtro reinicia a la página 1. */
  onSearch(): void {
    this.load(1);
  }

  /** Solo el paginador navega conservando los filtros vigentes. */
  onPageChange(page: number): void {
    this.load(page);
  }

  /** Pestañas de estado: mismo patrón que cualquier filtro, vuelve a la página 1. */
  setEstado(stateId: number | null): void {
    if (this.filtros.stateId === stateId) return;
    this.filtros.stateId = stateId;
    this.load(1);
  }

  /** Cambio de proyecto desde el modal: guarda también la etiqueta para el chip. */
  onProyectoChange(projectId: number | null): void {
    this.filtros.projectId = projectId;
    this.filtroProyectoLabel =
      projectId == null
        ? null
        : (this.projectOptions.find((p) => p.projectId === projectId)?.projectDescription ?? null);
    this.onSearch();
  }

  /** Quitar el filtro de proyecto desde el chip, sin reabrir el modal. */
  quitarFiltroProyecto(): void {
    this.onProyectoChange(null);
  }

  /** "Limpiar filtros" del modal solo afecta a lo que vive dentro del modal (proyecto). */
  limpiarFiltros(): void {
    this.onProyectoChange(null);
  }

  get filtrosActivos(): number {
    return this.filtros.projectId != null ? 1 : 0;
  }

  abrirFiltros(): void {
    this.filtrosAbiertos = true;
    if (!this.projectsLoaded) this.loadProjects();
  }

  private loadProjects(): void {
    this.projectResidentService.getProjectsDescription().subscribe({
      next: (data) => {
        this.projectOptions = data;
        this.projectsLoaded = true;
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  // ── Vista ────────────────────────────────────────────────────────────
  setView(view: ViewMode): void {
    this.currentView = view;
  }

  // ── Modales ──────────────────────────────────────────────────────────
  openCreateModal(): void {
    this.showCreateModal = true;
  }

  openResponseModal(item: ResidentReportIncidenceDTO): void {
    this.selectedReportIncidenceId = item.residentReportIncidenceId;
    this.showResponseModal = true;
  }

  openReportViewModal(item: ResidentReportIncidenceDTO): void {
    this.selectedIncidence = item;
    this.showReportViewModal = true;
  }

  /** Tras crear: vuelve a la primera página. Tras responder: conserva la página vigente. */
  onCreated(): void {
    this.load(1);
  }

  onResponded(): void {
    this.load(this.currentPage);
  }
}
