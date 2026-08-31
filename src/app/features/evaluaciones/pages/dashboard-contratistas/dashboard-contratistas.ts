import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvContratistaService } from '../../services/ev-contratista.service';
import {
  EvContratistaDashboardDto,
  EvContratistaResumenDto,
  EvContratistaTendenciaDto,
} from '../../dtos/ev-contratista.model';

@Component({
  selector: 'app-dashboard-contratistas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './dashboard-contratistas.html',
  styleUrl: './dashboard-contratistas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardContratistas implements OnInit, AfterViewInit {
  dashboard: EvContratistaDashboardDto | null = null;
  loading = true;
  contraHistaActivo: EvContratistaResumenDto | null = null;
  vista: 'ranking' | 'tendencia' = 'ranking';

  periodoId: number | null = null;
  proyectoId: number | null = null;

  private chartsInit = false;
  private chartRadar: Chart | null = null;
  private chartTendencia: Chart | null = null;
  private chartDonut: Chart | null = null;

  private readonly COLORES = [
    { bg: '#DCFCE7', border: '#059669' },
    { bg: '#DBEAFE', border: '#0284C7' },
    { bg: '#EDE9FE', border: '#7C3AED' },
    { bg: '#FEF3C7', border: '#D97706' },
    { bg: '#FEE2E2', border: '#DC2626' },
  ];

  get pctAprobados(): number {
    if (!this.dashboard?.totalContratistas) return 0;
    return Math.round((this.dashboard.aprobados / this.dashboard.totalContratistas) * 100);
  }

  get top5(): EvContratistaResumenDto[] {
    return (this.dashboard?.contratistas ?? []).slice(0, 5);
  }

  get bottom5(): EvContratistaResumenDto[] {
    const all = this.dashboard?.contratistas ?? [];
    return [...all].sort((a, b) => (a.notaTotal ?? 0) - (b.notaTotal ?? 0)).slice(0, 5);
  }

  scoreColor(nota: number | null): string {
    if (nota === null) return '#6B7280';
    if (nota > 15) return '#059669';
    if (nota >= 12) return '#D97706';
    return '#DC2626';
  }

  scoreClass(nota: number | null): string {
    if (nota === null) return 'score-eq';
    if (nota > 15) return 'score-hi';
    if (nota >= 12) return 'score-ok';
    return 'score-lo';
  }

  iniciales(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  constructor(
    private svc: EvContratistaService,
    private loader: LoaderService,
    private errorSvc: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    if (this.dashboard) setTimeout(() => this.renderCharts(), 100);
  }

  cargar(): void {
    this.loader.show();
    this.svc.getDashboard(this.periodoId, this.proyectoId).subscribe({
      next: (d) => {
        this.dashboard = d;
        this.contraHistaActivo = d.contratistas[0] ?? null;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
        setTimeout(() => this.renderCharts(), 100);
      },
      error: (err) => {
        this.loading = false;
        this.loader.hide();
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  selectContratista(c: EvContratistaResumenDto): void {
    this.contraHistaActivo = c;
    this.cdr.markForCheck();
    setTimeout(() => this.renderRadar(), 100);
  }

  setVista(v: 'ranking' | 'tendencia'): void {
    this.vista = v;
    this.cdr.markForCheck();
    setTimeout(() => this.renderCharts(), 100);
  }

  // ─── Charts ──────────────────────────────────────────────────────────────

  private renderCharts(): void {
    this.renderDonut();
    this.renderRadar();
    if (this.vista === 'tendencia') this.renderTendencia();
  }

  private renderDonut(): void {
    const canvas = document.getElementById('chart-donut-cv') as HTMLCanvasElement | null;
    if (!canvas || !this.dashboard) return;
    this.chartDonut?.destroy();
    const { aprobados, regulares, desaprobados } = this.dashboard;
    this.chartDonut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Aprobado', 'Regular', 'Desaprobado'],
        datasets: [{
          data: [aprobados, regulares, desaprobados],
          backgroundColor: ['#059669', '#D97706', '#DC2626'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
      },
    });
  }

  private renderRadar(): void {
    const canvas = document.getElementById('chart-radar-cv') as HTMLCanvasElement | null;
    if (!canvas || !this.contraHistaActivo) return;
    this.chartRadar?.destroy();
    const c = this.contraHistaActivo;
    const labels = ['Of. Técnica', 'SSOMA', 'Residencia', 'Calidad', 'Producción', 'Adm. de Obra'];
    const values = [c.notaOT, c.notaSsoma, c.notaResidencia, c.notaCalidad, c.notaProduccion, c.notaAdministracion]
      .map((v) => v ?? 0);
    this.chartRadar = new Chart(canvas, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: c.contributorNombre,
          data: values,
          backgroundColor: 'rgba(2,132,199,0.15)',
          borderColor: '#0284C7',
          pointBackgroundColor: '#0284C7',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { r: { min: 0, max: 20, ticks: { stepSize: 5, font: { size: 10 } } } },
        plugins: { legend: { display: false } },
      },
    });
  }

  private renderTendencia(): void {
    const canvas = document.getElementById('chart-tendencia-cv') as HTMLCanvasElement | null;
    if (!canvas || !this.dashboard?.tendencia.length) return;
    this.chartTendencia?.destroy();

    const periodos = [...new Set(
      this.dashboard.tendencia.map((t) => `${t.nombreMes} ${t.anio}`)
    )];
    const contratistas = [...new Map(
      this.dashboard.tendencia.map((t) => [t.contributorId, t.contributorNombre])
    ).entries()];

    const datasets = contratistas.slice(0, 7).map(([id, nombre], i) => {
      const col = this.COLORES[i % this.COLORES.length];
      const data = periodos.map((p) => {
        const match = this.dashboard!.tendencia.find(
          (t) => `${t.nombreMes} ${t.anio}` === p && t.contributorId === id,
        );
        return match?.notaTotal ?? null;
      });
      return { label: nombre, data, borderColor: col.border, backgroundColor: col.bg, tension: 0.3 };
    });

    this.chartTendencia = new Chart(canvas, {
      type: 'line',
      data: { labels: periodos, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } },
        scales: {
          y: { min: 0, max: 20, ticks: { stepSize: 5 }, title: { display: true, text: 'Nota /20' } },
        },
        spanGaps: true,
      },
    });
  }
}
