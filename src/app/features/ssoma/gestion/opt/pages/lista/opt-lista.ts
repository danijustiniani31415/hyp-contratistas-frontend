import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { OptService } from '../../services/opt.service';
import { OptListItemDto, OptListQuery, OptPagedResult } from '../../dtos/opt.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { TrabajadorHabService } from '../../../../../../features/habilitacion/services/trabajador-hab.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';

import { OPT_TABS } from '../../opt-tabs';
@Component({
  selector: 'app-opt-lista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FabButton, CommonModule, FormsModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchSelect, Paginator],
  templateUrl: './opt-lista.html',
  styleUrl: './opt-lista.css',
})
export class OptLista implements OnInit {
  readonly tabs = OPT_TABS;
  result: OptPagedResult | null = null;
  loading = false;
  query: OptListQuery = { page: 1, pageSize: 20 };
  filtrosAbiertos = false;
  readonly anioActual = new Date().getFullYear();

  filtroTipo = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtroProyectoId: number | undefined;
  filtroPetId: number | undefined;
  filtroTrabajadorId: number | undefined;
  filtroEmpresaObservadorId: number | undefined;
  filtroEmpresaTrabajadorId: number | undefined;

  proyectos: any[] = [];
  pets: any[] = [];
  workers: any[] = [];
  empresas: { id: number; nombre: string }[] = [];

  constructor(
    private optService: OptService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private projectService: ProjectService,
    private trabajadorHabService: TrabajadorHabService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    forkJoin({
      catalogos: this.optService.getCatalogos(),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, active: true }),
      workers: this.trabajadorHabService.getTrabajadores({ pageSize: 9999, soloVerificacion: true }),
      empresas: this.authService.getEmpresasContratistas(),
    }).subscribe({
      next: ({ catalogos, proyectos, workers, empresas }) => {
        this.pets = [...catalogos.pets].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.proyectos = [...proyectos.data].sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.workers = [...workers.data].sort((a, b) => a.apellidoNombre.localeCompare(b.apellidoNombre));
        this.empresas = empresas
          .map(e => ({ id: e.id, nombre: e.nombreComercial || e.razonSocial }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.markForCheck();
        this.load();
      },
      error: () => this.load(),
    });
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    const q: OptListQuery = {
      ...this.query,
      tipoObservacion: this.filtroTipo || undefined,
      fechaDesde: this.filtroFechaDesde || undefined,
      fechaHasta: this.filtroFechaHasta || undefined,
      proyectoId: this.filtroProyectoId,
      petId: this.filtroPetId,
      trabajadorId: this.filtroTrabajadorId,
      empresaObservadorId: this.filtroEmpresaObservadorId,
      empresaTrabajadorId: this.filtroEmpresaTrabajadorId,
      page: 1,
    };
    this.query = q;
    this.optService.getList(q).subscribe({
      next: (res) => {
        this.result = res;
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
    if (p < 1 || (this.result && p > this.result.totalPages)) return;
    this.query = { ...this.query, page: p };
    this.loading = true;
    this.loaderService.show();
    this.optService.getList(this.query).subscribe({
      next: (res) => {
        this.result = res;
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

  limpiarFiltros(): void {
    this.filtroTipo = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtroProyectoId = undefined;
    this.filtroPetId = undefined;
    this.filtroTrabajadorId = undefined;
    this.filtroEmpresaObservadorId = undefined;
    this.filtroEmpresaTrabajadorId = undefined;
    this.load();
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
    this.cdr.detectChanges();
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/opt', id]);
  }

  irANuevo(): void {
    this.router.navigate(['/ssoma/gestion/opt/nuevo']);
  }

  get hayFiltrosActivos(): number {
    return [
      this.filtroTipo, this.filtroFechaDesde, this.filtroFechaHasta,
      this.filtroProyectoId, this.filtroPetId, this.filtroTrabajadorId,
      this.filtroEmpresaObservadorId, this.filtroEmpresaTrabajadorId,
    ].filter(Boolean).length;
  }

  readonly tipoFilterOptions = [
    { value: '', label: 'Todo tipo' },
    { value: 'Planeada', label: 'Planeada' },
    { value: 'No Planeada', label: 'No Planeada' },
  ];

  scoreClass(score?: number): string {
    if (score === undefined || score === null) return 'score-na';
    if (score >= 80) return 'score-verde';
    if (score >= 60) return 'score-amarillo';
    return 'score-rojo';
  }

  accionClass(accion?: string): string {
    if (!accion || accion === 'Ninguna') return 'accion-none';
    return 'accion-req';
  }
}
