import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { ProjectService } from '../../../../../../core/services/project.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HorasHombreService } from '../../services/horas-hombre.service';
import { HorasHombreDiaDto } from '../../dtos/horas-hombre.model';

import { HORAS_HOMBRE_TABS } from '../../horas-hombre-tabs';
interface OpcionSimple { id: number; nombre: string; }

@Component({
  selector: 'app-horas-hombre-tabla',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect, Paginator, FilterTriggerButton, FilterModal],
  templateUrl: './horas-hombre-tabla.html',
  styleUrl: './horas-hombre-tabla.css',
})
export class HorasHombreTabla implements OnInit {
  readonly tabs = HORAS_HOMBRE_TABS;
  readonly pageSize = 20;

  proyectos: OpcionSimple[] = [];
  empresas: OpcionSimple[] = [];

  filtroProyectoId: number | null = null;
  filtroEmpresaId: number | null = null;
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtrosAbiertos = false;

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroProyectoId != null) n++;
    if (this.filtroEmpresaId != null) n++;
    if (this.filtroFechaDesde) n++;
    if (this.filtroFechaHasta) n++;
    return n;
  }

  items: HorasHombreDiaDto[] = [];
  loading = false;
  currentPage = 1;
  totalPages = 1;
  totalRecords = 0;

  constructor(
    private svc: HorasHombreService,
    private projectService: ProjectService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.projectService.getProjectsPaged({ pageSize: 300 }).subscribe({
      next: (res) => {
        this.proyectos = (res.data ?? [])
          .map((p) => ({ id: p.projectId, nombre: p.projectDescription }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.detectChanges();
      },
      error: () => { this.proyectos = []; },
    });
    this.authService.getEmpresasContratistas().subscribe({
      next: (res) => {
        this.empresas = (res ?? [])
          .map((e: any) => ({ id: e.id, nombre: e.razonSocial ?? e.nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.detectChanges();
      },
      error: () => { this.empresas = []; },
    });
    this.load(1);
  }

  onProyectoChange(id: number | null): void {
    this.filtroProyectoId = id;
    this.load(1);
  }

  onEmpresaChange(id: number | null): void {
    this.filtroEmpresaId = id;
    this.load(1);
  }

  onFilter(): void {
    this.load(1);
  }

  limpiarFiltros(): void {
    this.filtroProyectoId = null;
    this.filtroEmpresaId = null;
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  load(page: number): void {
    this.loading = true;
    this.loaderService.show();
    this.svc
      .getTabla({
        proyectoId: this.filtroProyectoId,
        empresaId: this.filtroEmpresaId,
        fechaDesde: this.filtroFechaDesde || null,
        fechaHasta: this.filtroFechaHasta || null,
        page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items = res.data ?? [];
          this.currentPage = res.page;
          this.totalPages = Math.max(res.totalPages, 1);
          this.totalRecords = res.totalRecords;
          this.loading = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  get totalHHPagina(): number {
    return this.items.reduce((acc, i) => acc + i.horasHombre, 0);
  }
}
