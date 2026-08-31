import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OptService } from '../../services/opt.service';
import { OptDashboardDto } from '../../dtos/opt.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProjectService } from '../../../../../../core/services/project.service';
import { HttpErrorResponse } from '@angular/common/http';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';

import { OPT_TABS } from '../../opt-tabs';
@Component({
  selector: 'app-opt-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FabButton, CommonModule, FormsModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchSelect],
  templateUrl: './opt-dashboard.html',
  styleUrl: './opt-dashboard.css',
})
export class OptDashboard implements OnInit {
  readonly tabs = OPT_TABS;
  data: OptDashboardDto | null = null;
  loading = true;
  readonly anioActual = new Date().getFullYear();

  proyectos: { projectId: number; projectDescription: string }[] = [];
  filtroProyectoId: number | null = null;
  filtroAnio: number | null = null;
  filtrosAbiertos = false;

  readonly aniosOptions: { value: number; label: string }[] = Array.from({ length: 5 }, (_, i) => {
    const anio = this.anioActual - i;
    return { value: anio, label: String(anio) };
  });

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroProyectoId != null) n++;
    if (this.filtroAnio != null) n++;
    return n;
  }

  constructor(
    private optService: OptService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private projectService: ProjectService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProyectos();
    this.load();
  }

  loadProyectos(): void {
    this.projectService.getProjectsPaged({ pageSize: 200, active: true }).subscribe({
      next: (res) => {
        this.proyectos = res.data;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.optService.getDashboard(this.filtroProyectoId ?? undefined, this.filtroAnio ?? undefined).subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onFiltroChange(): void {
    this.load();
  }

  limpiarFiltros(): void {
    this.filtroProyectoId = null;
    this.filtroAnio = null;
    this.load();
  }

  irANuevo(): void {
    this.router.navigate(['/ssoma/gestion/opt/nuevo']);
  }

  irALista(): void {
    this.router.navigate(['/ssoma/gestion/opt/lista']);
  }

  scoreClass(score?: number): string {
    if (score === undefined || score === null) return 'score--na';
    if (score >= 80) return 'score--verde';
    if (score >= 60) return 'score--amarillo';
    return 'score--rojo';
  }

  maxTendencia(): number {
    if (!this.data?.tendenciaMensual?.length) return 1;
    return Math.max(...this.data.tendenciaMensual.map((t) => t.totalOpts), 1);
  }

  barHeight(val: number): number {
    return Math.round((val / this.maxTendencia()) * 64);
  }

  maxEmpresaScore(): number {
    if (!this.data?.rankingEmpresas?.length) return 100;
    return Math.max(...this.data.rankingEmpresas.map((e) => e.scorePromedio ?? 0), 1);
  }
}
