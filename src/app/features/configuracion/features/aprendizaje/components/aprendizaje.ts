import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { AbrilPageHeaderComponent, SsomaHeaderBtn } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { StatusBadge } from '../../../../../shared/components/status-badge/status-badge';
import { AbrilBulkActionDirective } from '../../../../../shared/directives/abril-bulk-action.directive';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../shared/utils/client-pager';
import { FilterTriggerButton } from '../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../shared/components/filter-modal/filter-modal';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';

import { CONFIGURACION_TABS } from '../../../shared/configuracion-tabs';
import { AprendizajeAdminService } from '../services/aprendizaje-admin.service';
import { CategoryModal } from './category-modal/category-modal';
import { VideoModal } from './video-modal/video-modal';
import {
  LearningCategoryAdminDto,
  LearningRoleOptionDto,
  LearningSurfaceDto,
  LearningVideoAdminDto,
} from '../dtos/aprendizaje.dto';

/** Video aplanado con su grupo/superficie, para la tabla de "Videos". */
interface VideoRow extends LearningVideoAdminDto {
  categoriaId: number;
  categoriaNombre: string;
  surfaceCode: string;
}

@Component({
  standalone: true,
  selector: 'app-aprendizaje',
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    SectionTabs,
    StatusBadge,
    AbrilBulkActionDirective,
    Paginator,
    FilterTriggerButton,
    FilterModal,
    SearchInput,
    SearchSelect,
    CategoryModal,
    VideoModal,
  ],
  templateUrl: './aprendizaje.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class Aprendizaje implements OnInit {
  readonly tabs = CONFIGURACION_TABS;

  categorias: LearningCategoryAdminDto[] = [];
  superficies: LearningSurfaceDto[] = [];
  roles: LearningRoleOptionDto[] = [];
  videos: VideoRow[] = [];

  vista: 'grupos' | 'videos' = 'grupos';

  // Filtros
  gruposSearch = '';
  gruposSurface: string | null = null;
  gruposEstado: boolean | null = null;
  videosSearch = '';
  videosCategoria: number | null = null;
  videosEstado: boolean | null = null;
  filtrosAbiertos = false;

  readonly estadoOptions = [
    { value: null, label: 'Todos' },
    { value: true, label: 'Activo' },
    { value: false, label: 'Inactivo' },
  ];

  // Modales
  showCategoryModal = false;
  categoryToEdit: LearningCategoryAdminDto | null = null;
  showVideoModal = false;
  videoToEdit: VideoRow | null = null;

  private readonly gruposPager = new ClientPager<LearningCategoryAdminDto>();
  private readonly videosPager = new ClientPager<VideoRow>();

  constructor(
    private service: AprendizajeAdminService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.getAll().subscribe({
      next: (data) => {
        this.categorias = data.categorias;
        this.superficies = data.superficies;
        this.roles = data.roles;
        this.videos = data.categorias.flatMap((c) =>
          c.videos.map((v) => ({
            ...v,
            categoriaId: c.id,
            categoriaNombre: c.nombre,
            surfaceCode: c.surfaceCode,
          })),
        );
        this.gruposPager.reset();
        this.videosPager.reset();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  // ── Section tabs (Grupos / Videos) ────────────────────────────────────────
  get sectionTabs(): SectionTab[] {
    return [
      { id: 'grupos', label: 'Grupos', badge: this.categorias.length },
      { id: 'videos', label: 'Videos', badge: this.videos.length },
    ];
  }

  onSectionChange(id: string): void {
    this.vista = id as 'grupos' | 'videos';
  }

  // ── Header primary button (depende de la vista) ───────────────────────────
  get botonPrimario(): SsomaHeaderBtn {
    return this.vista === 'grupos'
      ? { label: 'Nuevo grupo', icono: 'ti-plus' }
      : { label: 'Nuevo video', icono: 'ti-plus' };
  }

  onPrimary(): void {
    if (this.vista === 'grupos') {
      this.categoryToEdit = null;
      this.showCategoryModal = true;
    } else {
      this.videoToEdit = null;
      this.showVideoModal = true;
    }
  }

  // ── Opciones de filtro derivadas ──────────────────────────────────────────
  get surfaceOptions(): { value: string | null; label: string }[] {
    return [{ value: null, label: 'Todas' }, ...this.superficies.map((s) => ({ value: s.code, label: s.nombre }))];
  }

  get categoriaOptions(): { value: number | null; label: string }[] {
    return [{ value: null, label: 'Todos los grupos' }, ...this.categorias.map((c) => ({ value: c.id, label: c.nombre }))];
  }

  // ── Filtros / paginación: GRUPOS ──────────────────────────────────────────
  get filteredGrupos(): LearningCategoryAdminDto[] {
    return this.categorias.filter((c) => {
      const okTexto = !this.gruposSearch.trim() || SearchInput.matches(c.nombre, this.gruposSearch);
      const okSurface = this.gruposSurface === null || c.surfaceCode === this.gruposSurface;
      const okEstado = this.gruposEstado === null || c.activo === this.gruposEstado;
      return okTexto && okSurface && okEstado;
    });
  }

  get pagedGrupos(): LearningCategoryAdminDto[] {
    return this.gruposPager.page(this.filteredGrupos);
  }

  get gruposCurrentPage(): number {
    return this.gruposPager.currentPage;
  }

  get gruposTotalPages(): number {
    return this.gruposPager.totalPages(this.filteredGrupos);
  }

  changeGruposPage(p: number): void {
    this.gruposPager.goTo(p);
  }

  // ── Filtros / paginación: VIDEOS ──────────────────────────────────────────
  get filteredVideos(): VideoRow[] {
    return this.videos.filter((v) => {
      const okTexto = !this.videosSearch.trim() || SearchInput.matches(v.titulo, this.videosSearch);
      const okCat = this.videosCategoria === null || v.categoriaId === this.videosCategoria;
      const okEstado = this.videosEstado === null || v.activo === this.videosEstado;
      return okTexto && okCat && okEstado;
    });
  }

  get pagedVideos(): VideoRow[] {
    return this.videosPager.page(this.filteredVideos);
  }

  get videosCurrentPage(): number {
    return this.videosPager.currentPage;
  }

  get videosTotalPages(): number {
    return this.videosPager.totalPages(this.filteredVideos);
  }

  changeVideosPage(p: number): void {
    this.videosPager.goTo(p);
  }

  // ── Filtros: estado (contador + limpiar) ──────────────────────────────────
  get filtrosActivos(): number {
    let n = 0;
    if (this.vista === 'grupos') {
      if (this.gruposSearch.trim()) n++;
      if (this.gruposSurface !== null) n++;
      if (this.gruposEstado !== null) n++;
    } else {
      if (this.videosSearch.trim()) n++;
      if (this.videosCategoria !== null) n++;
      if (this.videosEstado !== null) n++;
    }
    return n;
  }

  onFilterChange(): void {
    this.gruposPager.reset();
    this.videosPager.reset();
  }

  limpiarFiltros(): void {
    if (this.vista === 'grupos') {
      this.gruposSearch = '';
      this.gruposSurface = null;
      this.gruposEstado = null;
    } else {
      this.videosSearch = '';
      this.videosCategoria = null;
      this.videosEstado = null;
    }
    this.onFilterChange();
  }

  // ── Etiqueta de visibilidad de un grupo (para la tabla) ───────────────────
  visibilidadLabel(c: LearningCategoryAdminDto): string {
    if (c.surfaceCode === 'LOGIN') return 'Público (login)';
    if (c.esPublicoInterno) return 'Todo Abril';
    const n = c.roleIds.length;
    return n === 1 ? '1 rol' : `${n} roles`;
  }

  surfaceLabel(code: string): string {
    return this.superficies.find((s) => s.code === code)?.nombre ?? code;
  }

  // ── Acciones: GRUPOS ──────────────────────────────────────────────────────
  editCategory(c: LearningCategoryAdminDto): void {
    this.categoryToEdit = c;
    this.showCategoryModal = true;
  }

  toggleCategory(c: LearningCategoryAdminDto): void {
    this.loaderService.show();
    this.service.toggleCategory(c.id).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  deleteCategory(c: LearningCategoryAdminDto): void {
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar grupo?',
      text: `Se eliminará "${c.nombre}" y sus videos. Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.service.deleteCategory(c.id).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  // ── Acciones: VIDEOS ──────────────────────────────────────────────────────
  editVideo(v: VideoRow): void {
    this.videoToEdit = v;
    this.showVideoModal = true;
  }

  toggleVideo(v: VideoRow): void {
    this.loaderService.show();
    this.service.toggleVideo(v.id).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  deleteVideo(v: VideoRow): void {
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar video?',
      text: `Se eliminará "${v.titulo}".`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loaderService.show();
      this.service.deleteVideo(v.id).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  // ── Cierre de modales ─────────────────────────────────────────────────────
  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.categoryToEdit = null;
  }

  closeVideoModal(): void {
    this.showVideoModal = false;
    this.videoToEdit = null;
  }
}
