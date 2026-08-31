import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ObservacionesService } from '../../../../../core/services/arquitectura-comercial/observaciones.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  ObservacionDashboardDTO,
  ObservacionDashboardSupervisorDTO,
  ProyectoFiltroDTO,
} from '../../../../../core/dtos/arquitectura-comercial/observaciones.model';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';

import { AC_OBSERVACIONES_TABS } from '../../../shared/arquitectura-comercial-tabs';
@Component({
  selector: 'app-arq-comercial-observaciones-dashboard',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './observaciones-dashboard.html',
  styleUrl: './observaciones-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservacionesDashboard implements OnInit {
  readonly tabs = AC_OBSERVACIONES_TABS;
  anioActual = new Date().getFullYear();

  data: ObservacionDashboardDTO | null = null;
  proyectos: ProyectoFiltroDTO[] = [];
  proyectoId: number | null = null;
  loading = true;
  error = '';

  constructor(
    private service: ObservacionesService,
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
    this.router.navigate(['/arquitectura-comercial/observaciones/lista']);
  }

  acuerdosPendientes(s: ObservacionDashboardSupervisorDTO): number {
    return s.totalPendientes + s.totalEnProceso;
  }

  /** deg del arco "avance" para el donut, sobre 360°. */
  donutDeg(s: ObservacionDashboardSupervisorDTO): number {
    return Math.round((s.pctAvance / 100) * 360);
  }

  donutStyle(s: ObservacionDashboardSupervisorDTO): Record<string, string> {
    const deg = this.donutDeg(s);
    return {
      background: `conic-gradient(var(--color-abril-standard) ${deg}deg, #E5E7EB ${deg}deg 360deg)`,
    };
  }

  maxPartidaTotal(s: ObservacionDashboardSupervisorDTO): number {
    return Math.max(...s.porPartida.map((p) => p.completado + p.pendiente), 1);
  }

  barWidthPct(valor: number, s: ObservacionDashboardSupervisorDTO): number {
    return Math.round((valor / this.maxPartidaTotal(s)) * 100);
  }

  trackBySupervisor(_: number, s: ObservacionDashboardSupervisorDTO): string {
    return s.personaReporta;
  }

  trackByPartida(_: number, p: { partida: string }): string {
    return p.partida;
  }
}
