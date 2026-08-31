import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { RevisionesService } from '../../../../../core/services/arquitectura-comercial/revisiones.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  RevisionDashboardDTO,
  RevisionDashboardGrupoDTO,
  ProyectoRevisionFiltroDTO,
} from '../../../../../core/dtos/arquitectura-comercial/revisiones.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';

import { AC_REVISIONES_TABS } from '../../../shared/arquitectura-comercial-tabs';
@Component({
  selector: 'app-arq-comercial-revisiones-dashboard',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './revisiones-dashboard.html',
  styleUrl: './revisiones-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevisionesDashboard implements OnInit {
  readonly tabs = AC_REVISIONES_TABS;
  anioActual = new Date().getFullYear();

  data: RevisionDashboardDTO | null = null;
  proyectos: ProyectoRevisionFiltroDTO[] = [];
  proyectoId: number | null = null;
  loading = true;
  error = '';

  constructor(
    private service: RevisionesService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFiltros();
    this.load();
  }

  loadFiltros(): void {
    this.service.getFiltros().subscribe({
      next: (data) => {
        this.proyectos = [...data.proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.getDashboard(null, null, this.proyectoId).subscribe({
      next: (data) => {
        this.data = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.error = 'No se pudo cargar el dashboard.';
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onProyectoChange(id: number | null): void {
    this.proyectoId = id;
    this.load();
  }

  irALista(): void {
    this.router.navigate(['/arquitectura-comercial/revisiones/lista']);
  }

  acuerdosPendientes(g: RevisionDashboardGrupoDTO): number {
    return g.totalPendientes + g.totalEnProceso;
  }

  donutDeg(g: RevisionDashboardGrupoDTO): number {
    return Math.round((g.pctAvance / 100) * 360);
  }

  donutStyle(g: RevisionDashboardGrupoDTO): Record<string, string> {
    const deg = this.donutDeg(g);
    return {
      background: `conic-gradient(var(--color-abril-standard) ${deg}deg, #E5E7EB ${deg}deg 360deg)`,
    };
  }

  maxPartidaTotal(g: RevisionDashboardGrupoDTO): number {
    return Math.max(...g.porPartida.map((p) => p.completado + p.pendiente), 1);
  }

  barWidthPct(valor: number, g: RevisionDashboardGrupoDTO): number {
    return Math.round((valor / this.maxPartidaTotal(g)) * 100);
  }

  trackByGrupo(_: number, g: RevisionDashboardGrupoDTO): string {
    return g.personaReporta + '|' + (g.revisionNombre ?? '');
  }

  trackByPartida(_: number, p: { partida: string }): string {
    return p.partida;
  }
}
