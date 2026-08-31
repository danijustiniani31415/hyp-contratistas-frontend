import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { InspeccionService } from '../../inspeccion.service';
import { InspeccionListItemDto, InspeccionTipoDto } from '../../inspeccion.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { StatusBadge } from '../../../../../../shared/components/status-badge/status-badge';

import { INSPECCION_TABS } from '../../inspeccion-tabs';
@Component({
  selector: 'app-inspeccion-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FabButton, CommonModule, FormsModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchSelect, Paginator, StatusBadge],
  templateUrl: './inspeccion-lista.component.html',
  styleUrl: './inspeccion-lista.component.css',
})
export class InspeccionListaComponent implements OnInit {
  readonly tabs = INSPECCION_TABS;
  items: InspeccionListItemDto[] = [];
  loading = true;
  total = 0;
  page = 1;
  readonly pageSize = 20;

  tipos: InspeccionTipoDto[] = [];
  proyectos: any[] = [];
  filtrosAbiertos = false;

  filtroProyectoId: number | undefined;
  filtroTipoId: number | undefined;
  filtroEstado = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  constructor(
    private inspeccionService: InspeccionService,
    private projectService: ProjectService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    forkJoin({
      catalogos: this.inspeccionService.getCatalogos(),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, active: true }),
    }).subscribe({
      next: ({ catalogos, proyectos }) => {
        this.tipos = catalogos.tipos;
        this.proyectos = [...proyectos.data].sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.cdr.markForCheck();
        this.load();
      },
      error: () => this.load(),
    });
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.page = 1;
    this.inspeccionService
      .getList({
        proyectoId: this.filtroProyectoId,
        tipoId: this.filtroTipoId,
        estado: this.filtroEstado || undefined,
        fechaDesde: this.filtroFechaDesde || undefined,
        fechaHasta: this.filtroFechaHasta || undefined,
        page: 1,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.total = res.total;
          this.loading = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.loading = true;
    this.loaderService.show();
    this.inspeccionService
      .getList({
        proyectoId: this.filtroProyectoId,
        tipoId: this.filtroTipoId,
        estado: this.filtroEstado || undefined,
        fechaDesde: this.filtroFechaDesde || undefined,
        fechaHasta: this.filtroFechaHasta || undefined,
        page: p,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.total = res.total;
          this.loading = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
  }

  onProyectoChange(id: number | null): void {
    this.filtroProyectoId = id ?? undefined;
    this.load();
  }

  limpiarFiltros(): void {
    this.filtroProyectoId = undefined;
    this.filtroTipoId = undefined;
    this.filtroEstado = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.load();
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    this.cdr.detectChanges();
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/inspeccion', id]);
  }

  irANueva(): void {
    this.router.navigate(['/ssoma/gestion/inspeccion/nueva']);
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get hayFiltros(): boolean {
    return !!(this.filtroProyectoId || this.filtroTipoId || this.filtroEstado || this.filtroFechaDesde || this.filtroFechaHasta);
  }

  readonly estadoFilterOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'Borrador', label: 'Borrador' },
    { value: 'EnProceso', label: 'En Proceso' },
    { value: 'Cerrada', label: 'Cerrada' },
  ];

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroProyectoId) n++;
    if (this.filtroTipoId) n++;
    if (this.filtroEstado) n++;
    if (this.filtroFechaDesde) n++;
    if (this.filtroFechaHasta) n++;
    return n;
  }

  scoreClass(v?: number | null): string {
    if (v == null) return 'score-na';
    if (v >= 80) return 'score-verde';
    if (v >= 60) return 'score-amarillo';
    return 'score-rojo';
  }

  estadoClass(estado: string): string {
    if (estado === 'Cerrada') return 'estado-cerrada';
    if (estado === 'EnProceso' || estado === 'En Proceso') return 'estado-proceso';
    return 'estado-borrador';
  }

  /** Colores del badge de ámbito para app-status-badge (modo manual bgColor/textColor). */
  ambitoBg(ambito: string): string {
    if (ambito === 'Seguridad') return '#DBEAFE';
    if (ambito === 'Salud') return '#D1FAE5';
    return '#DCFCE7';
  }

  ambitoText(ambito: string): string {
    if (ambito === 'Seguridad') return '#1E40AF';
    if (ambito === 'Salud') return '#065F46';
    return '#166534';
  }
}
