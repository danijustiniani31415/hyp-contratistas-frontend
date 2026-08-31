import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { GestionVecinosService, VecinoFilter } from '../services/gestion-vecinos.service';
import {
  VecinoFormOptionsDTO,
  VecinoListItemDTO,
  CroquisGestionDTO,
  CatalogOptionDTO,
  ProjectOptionDTO,
} from '../dtos/gestion-vecinos.dto';
import { GestionCroquisView } from './croquis-view/gestion-croquis-view';
import { GestionCroquisAdd } from './croquis-add/gestion-croquis-add';
import { GestionVecinosList } from './list/gestion-vecinos-list';
import { GestionVecinosCard } from './card/gestion-vecinos-card';
import { GestionVecinosDetail } from './detail/gestion-vecinos-detail';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { ViewToggle } from '../../../../shared/components/view-toggle/view-toggle';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { ViewToggleMode } from '../../../../shared/components/view-toggle/view-toggle.model';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';

import { VECINOS_TABS } from '../../shared/vecinos-tabs';
@Component({
  selector: 'app-gestion-vecinos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GestionVecinosList,
    GestionVecinosCard,
    GestionVecinosDetail,
    GestionCroquisView,
    GestionCroquisAdd,
    Paginator,
    ViewToggle,
    SearchSelect,
    AbrilPageHeaderComponent,
  ],
  templateUrl: './gestion-vecinos.html',
})
export class GestionVecinos implements OnInit {
  readonly tabs = VECINOS_TABS;
  vecinos: VecinoListItemDTO[] = [];
  options: VecinoFormOptionsDTO = { projects: [], colindancias: [], tiposConstruccion: [], usos: [], relacionTipos: [] };

  currentPage = 1;
  totalPages = 1;
  totalRecords = 0;

  // Filtros
  searchProjectId: number | null = null;
  searchColindanciaId: number | null = null;
  searchText = '';

  // Filtro de la vista croquis (cliente): seleccionado vs. aplicado (al buscar).
  croquisProjectId: number | null = null;
  croquisAppliedProjectId: number | null = null;

  // 'croquis' es la vista por defecto.
  viewMode = 'croquis';
  selectedVecino: VecinoListItemDTO | null = null;

  // Vista por croquis (carga perezosa según vista).
  croquis: CroquisGestionDTO[] = [];
  croquisProjects: ProjectOptionDTO[] = [];
  croquisColindancias: CatalogOptionDTO[] = [];
  croquisTipos: CatalogOptionDTO[] = [];
  croquisUsos: CatalogOptionDTO[] = [];
  croquisRelacionTipos: CatalogOptionDTO[] = [];
  showCroquisAdd = false;
  /** Preselección del alta cuando se abre desde el croquis agrandado. */
  addInitialProjectId: number | null = null;
  addInitialLoteId: number | null = null;
  private croquisLoaded = false;
  private vecinosLoaded = false;

  viewModes: ViewToggleMode[] = [
    {
      value: 'croquis',
      label: 'Croquis',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/></svg>`,
    },
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

  constructor(
    private service: GestionVecinosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    // La vista por defecto es croquis: cargamos esos datos primero.
    this.loadCroquis();
  }

  /** Catálogos para el modo edición del detalle (de croquis si están, si no del listado). */
  get detailColindancias(): CatalogOptionDTO[] {
    return this.croquisColindancias.length ? this.croquisColindancias : this.options.colindancias;
  }
  get detailTipos(): CatalogOptionDTO[] {
    return this.croquisTipos.length ? this.croquisTipos : this.options.tiposConstruccion;
  }
  get detailUsos(): CatalogOptionDTO[] {
    return this.croquisUsos.length ? this.croquisUsos : this.options.usos;
  }
  get detailRelacionTipos(): CatalogOptionDTO[] {
    return this.croquisRelacionTipos.length ? this.croquisRelacionTipos : this.options.relacionTipos;
  }

  /** Una propiedad cambió en el detalle: invalida las fuentes para refrescar al volver. */
  onVecinoUpdated(): void {
    this.croquisLoaded = false;
    this.vecinosLoaded = false;
    if (this.viewMode === 'croquis') this.loadCroquis();
    else this.load(this.currentPage);
  }

  /** Proyectos con croquis (opciones del filtro de la vista croquis). */
  get croquisProjectOptions(): ProjectOptionDTO[] {
    return this.croquis.map((c) => ({
      projectId: c.projectId,
      projectDescription: c.projectDescription,
    }));
  }

  /** Cambio de vista: carga perezosa de los datos que cada vista necesita. */
  onViewChange(mode: string): void {
    this.viewMode = mode;
    if (mode === 'croquis') this.loadCroquis();
    else this.loadVecinosPage();
  }

  private loadCroquis(): void {
    if (this.croquisLoaded) return;
    this.loaderService.show();
    this.service.getCroquisGestion().subscribe({
      next: (res) => {
        this.croquis = res.croquis;
        this.croquisProjects = res.projects;
        this.croquisColindancias = res.colindancias;
        this.croquisTipos = res.tiposConstruccion;
        this.croquisUsos = res.usos;
        this.croquisRelacionTipos = res.relacionTipos;
        this.croquisLoaded = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private loadVecinosPage(): void {
    if (this.vecinosLoaded) return;
    this.loaderService.show();
    this.service.getPageData({ page: 1 }).subscribe({
      next: (res) => {
        this.options = res.options;
        this.applyPaged(res.vecinos);
        this.vecinosLoaded = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Recarga los croquis tras un cambio (alta de vecino, asignación de lote, etc.). */
  reloadCroquis(): void {
    this.croquisLoaded = false;
    this.loadCroquis();
  }

  openCroquisAdd(): void {
    // El form de alta usa los datos de croquis (proyectos, catálogos, lotes).
    this.addInitialProjectId = null;
    this.addInitialLoteId = null;
    this.loadCroquis();
    this.showCroquisAdd = true;
  }

  /** Alta desde el croquis agrandado: proyecto (y lote, si hay) precargados. */
  openCroquisAddFrom(evt: { projectId: number; loteId: number | null }): void {
    this.addInitialProjectId = evt.projectId;
    this.addInitialLoteId = evt.loteId;
    this.loadCroquis();
    this.showCroquisAdd = true;
  }

  closeCroquisAdd(): void {
    this.showCroquisAdd = false;
    this.addInitialProjectId = null;
    this.addInitialLoteId = null;
  }

  onCroquisCreated(): void {
    this.showCroquisAdd = false;
    // Ambas fuentes quedan desactualizadas; recarga la vista activa.
    this.croquisLoaded = false;
    this.vecinosLoaded = false;
    if (this.viewMode === 'croquis') this.loadCroquis();
    else this.loadVecinosPage();
  }

  private currentFilter(page: number): VecinoFilter {
    return {
      page,
      projectId: this.searchProjectId ?? undefined,
      vecinoColindanciaId: this.searchColindanciaId ?? undefined,
      search: this.searchText.trim() || undefined,
    };
  }

  private applyPaged(res: { data: VecinoListItemDTO[]; page: number; totalPages: number; totalRecords: number }): void {
    this.vecinos = res.data;
    this.currentPage = res.page;
    this.totalPages = res.totalPages;
    this.totalRecords = res.totalRecords;
  }

  load(page: number): void {
    this.loaderService.show();
    this.service.getList(this.currentFilter(page)).subscribe({
      next: (res) => {
        this.applyPaged(res);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  search(): void {
    this.load(1);
  }

  /** Aplica el filtro de proyecto en la vista croquis. */
  searchCroquis(): void {
    this.croquisAppliedProjectId = this.croquisProjectId;
  }

  openDetail(item: VecinoListItemDTO): void {
    this.selectedVecino = item;
  }

  closeDetail(): void {
    this.selectedVecino = null;
  }

}
