import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import Chart from 'chart.js/auto';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { EvDashboardService } from '../../services/ev-dashboard.service';
import { EvPeriodoService } from '../../services/ev-periodo.service';
import { EvDashboardGerenciaDto, EvResidenteResumenDto } from '../../dtos/ev-dashboard.model';
import { EvEvaluacionResponseDto } from '../../dtos/ev-evaluacion.model';
import { EvPeriodoDto } from '../../dtos/ev-periodo.model';

@Component({
  selector: 'app-dashboard-gerencia',
  standalone: true,
  imports: [CommonModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './dashboard-gerencia.html',
  styleUrl: './dashboard-gerencia.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardGerencia implements OnInit, AfterViewInit {
  periodo: EvPeriodoDto | null = null;
  dashboard: EvDashboardGerenciaDto | null = null;
  loading = true;
  residenteActivo: EvResidenteResumenDto | null = null;
  vistaActiva: 'mensual' | 'historico' | 'tendencia' = 'mensual';
  mostrarDetalleArea = false;
  areaSeleccionada: string | null = null;
  chartBarrasId = 'chart-barras-ev';
  chartTendenciaId = 'chart-tendencia-ev';
  residenteActivoTendencia: number | null = null;

  private readonly COLORES = [
    { bg: '#DCFCE7', border: '#059669' },
    { bg: '#DBEAFE', border: '#0284C7' },
    { bg: '#EDE9FE', border: '#7C3AED' },
    { bg: '#FEF3C7', border: '#D97706' },
    { bg: '#FEE2E2', border: '#DC2626' },
    { bg: '#E0F2FE', border: '#0369A1' },
    { bg: '#FCE7F3', border: '#BE185D' },
  ];
  private color(i: number) { return this.COLORES[i % this.COLORES.length]; }

  constructor(
    private dashService: EvDashboardService,
    private periodoService: EvPeriodoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    if (this.dashboard) {
      setTimeout(() => this.renderCharts(), 50);
    }
  }

  ngOnInit(): void {
    // El dashboard es un resumen de solo lectura: usa el ÚLTIMO período registrado,
    // no el "activo" (que solo existe durante la ventana de evaluación, día 25 -> día 4).
    // Así se ve todo el mes, no solo esos días.
    this.periodoService.getUltimo().subscribe({
      next: (p) => {
        this.periodo = p;
        this.loadDashboard(p.id);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadDashboard(periodoId: number): void {
    this.dashService.getGerencia(periodoId).subscribe({
      next: (d) => {
        this.dashboard = d;
        this.residenteActivo = d.residentes[0] ?? null;
        this.residenteActivoTendencia = null;
        this.loading = false;
        console.log('tendencia:', d.tendencia);
        this.cdr.markForCheck();
        setTimeout(() => this.renderCharts(), 100);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectResidente(r: EvResidenteResumenDto): void {
    this.residenteActivo = r;
    if (this.vistaActiva === 'tendencia') {
      this.residenteActivoTendencia = r.userId;
    }
    this.mostrarDetalleArea = false;
    this.areaSeleccionada = null;
    this.cdr.markForCheck();
    setTimeout(() => this.renderCharts(), 100);
  }

  scoreColor(nota: number | null): string {
    if (nota === null) return '#6B7280';
    if (nota >= 16) return '#059669';
    if (nota >= 12) return '#D97706';
    return '#DC2626';
  }

  scoreClass(nota: number | null): string {
    if (nota === null) return 'score-eq';
    if (nota >= 16) return 'score-hi';
    if (nota >= 12) return 'score-ok';
    return 'score-lo';
  }

  areaColor(nota: number | null): string {
    if (nota === null) return '#1e2d45';
    if (nota >= 16) return '#14532d22';
    if (nota >= 12) return '#451a0322';
    return '#450a0a22';
  }

  areaBorderColor(nota: number | null): string {
    if (nota === null) return '#1e2d45';
    if (nota >= 16) return '#14532d';
    if (nota >= 12) return '#451a03';
    return '#450a0a';
  }

  areaTextColor(nota: number | null): string {
    if (nota === null) return '#475569';
    if (nota >= 16) return '#4ade80';
    if (nota >= 12) return '#fbbf24';
    return '#f87171';
  }

  tendencia(r: EvResidenteResumenDto): string {
    if (!r.promedioMesAnterior || !r.promedioGeneral) return 'eq';
    const diff = r.promedioGeneral - r.promedioMesAnterior;
    if (diff > 0) return 'up';
    if (diff < 0) return 'dn';
    return 'eq';
  }

  diffMes(r: EvResidenteResumenDto): string {
    if (!r.promedioMesAnterior || !r.promedioGeneral) return '—';
    const diff = r.promedioGeneral - r.promedioMesAnterior;
    return (diff >= 0 ? '+' : '') + diff.toFixed(1);
  }

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  avatarColor(idx: number): string {
    const colors = ['#EEF2FF', '#F0F9FF', '#FAF5FF', '#F9FAFB', '#FEF2F2'];
    return colors[idx % colors.length];
  }

  avatarTextColor(idx: number): string {
    const colors = ['#4338CA', '#0369A1', '#7E22CE', '#374151', '#991B1B'];
    return colors[idx % colors.length];
  }

  getDetallesPorArea(evaluaciones: any[], area: string): any[] {
    return evaluaciones.filter((e) => e.areaNombre === area);
  }

  getNombreMesAnterior(): string {
    if (!this.periodo) return 'Mes ant.';
    const m = this.periodo.mes === 1 ? 12 : this.periodo.mes - 1;
    return new Date(2000, m - 1, 1).toLocaleString('es-PE', { month: 'long' });
  }

  getComentariosResidente(): EvEvaluacionResponseDto[] {
    if (!this.dashboard || !this.residenteActivo) return [];
    return this.dashboard.ultimosComentarios.filter(
      (c) => c.evaluadoUserId === this.residenteActivo!.userId,
    );
  }

  setVista(v: 'mensual' | 'tendencia'): void {
    this.vistaActiva = v;
    this.cdr.detectChanges();
    setTimeout(() => this.renderCharts(), 150);
  }

  renderCharts(): void {
    if (!this.dashboard) return;
    if (this.vistaActiva === 'mensual') this.renderBarras();
    if (this.vistaActiva === 'tendencia') this.renderTendencia();
  }

  private renderBarras(): void {
    const canvasEl = document.getElementById(this.chartBarrasId) as HTMLCanvasElement;
    if (!canvasEl || !this.dashboard) return;
    const existing = Chart.getChart(canvasEl);
    if (existing) existing.destroy();
    const residentes = this.dashboard.residentes;

    new Chart(canvasEl, {
      type: 'bar',
      data: {
        labels: residentes.map((r) => r.nombre.split(' ').slice(0, 2).join(' ')),
        datasets: [
          {
            label: this.periodo?.nombreMes ?? 'Actual',
            data: residentes.map((r) => r.promedioGeneral ?? 0),
            backgroundColor: '#1E3A5F',
            borderWidth: 0,
            borderRadius: 4,
            barPercentage: 0.38,
            categoryPercentage: 0.85,
          },
          {
            label: this.getNombreMesAnterior(),
            data: residentes.map((r) => r.promedioMesAnterior ?? 0),
            backgroundColor: '#CBD5E1',
            borderWidth: 0,
            borderRadius: 4,
            barPercentage: 0.38,
            categoryPercentage: 0.85,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true, position: 'top', align: 'end',
            labels: { color: '#6B7280', font: { size: 10 }, boxWidth: 10, padding: 14, usePointStyle: true },
          },
          datalabels: {
            anchor: 'end', align: 'top',
            color: '#374151',
            font: { size: 10, weight: 'bold' as const },
            formatter: (v: number) => v > 0 ? v.toFixed(1) : '',
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#6B7280', font: { size: 9 }, maxRotation: 20 },
          },
          y: {
            min: 10, max: 20,
            grid: { color: '#F1F5F9' },
            border: { display: false },
            ticks: { color: '#9CA3AF', font: { size: 9 }, stepSize: 2 },
          },
        },
      },
      plugins: [
        {
          id: 'separators',
          afterDraw(chart: any) {
            const { ctx, scales: { x } } = chart;
            ctx.save();
            ctx.strokeStyle = '#E2E8F0';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            x.ticks.forEach((_: any, i: number) => {
              if (i === 0) return;
              const xPos = x.getPixelForTick(i) - (x.getPixelForTick(1) - x.getPixelForTick(0)) / 2;
              ctx.beginPath();
              ctx.moveTo(xPos, chart.chartArea.top);
              ctx.lineTo(xPos, chart.chartArea.bottom);
              ctx.stroke();
            });
            ctx.restore();
          },
        },
      ],
    });
  }

  private renderTendencia(): void {
    const canvasEl = document.getElementById(this.chartTendenciaId) as HTMLCanvasElement;
    if (!canvasEl || !this.dashboard) return;
    const existing = Chart.getChart(canvasEl);
    if (existing) existing.destroy();
    const hoy = new Date();
    const tendencia = this.dashboard.tendencia.filter(
      (t) => new Date(t.anio, t.mes - 1, 1) <= hoy,
    );
    const allKeys = tendencia.map((t) => `${t.anio}-${String(t.mes).padStart(2, '0')}`);
    const mesesKeys = [...new Set(allKeys)].sort();
    const mesesLabels = mesesKeys.map((k) => {
      const [y, m] = k.split('-');
      const fecha = new Date(+y, +m - 1, 1);
      const mes = fecha.toLocaleString('es-PE', { month: 'short' });
      return mes.charAt(0).toUpperCase() + mes.slice(1);
    });
    const userIds = [...new Set(tendencia.map((t) => Number(t.userId)))];
    console.log('residenteActivoTendencia:', this.residenteActivoTendencia, typeof this.residenteActivoTendencia);
    console.log('residenteActivoTendencia VALUE:', this.residenteActivoTendencia);
    console.log('userIds en tendencia:', userIds);
    const datasets = userIds.map((uid, idx) => {
      const r = this.dashboard!.residentes.find((r) => r.userId === uid);
      const nombre = r?.nombre.split(' ').slice(0, 2).join(' ') ?? `User ${uid}`;
      const isSelected = this.residenteActivoTendencia !== null && Number(this.residenteActivoTendencia) === Number(uid);
      const hasSelection = this.residenteActivoTendencia !== null;
      const active = !hasSelection || isSelected;
      console.log(`dataset uid=${uid} isSelected=${isSelected} active=${active} borderColor=${active ? this.color(idx).border : '#E2E8F0'} borderWidth=${isSelected ? 2.5 : (active ? 1.5 : 0.5)}`);

      return {
        label: nombre,
        data: mesesKeys.map((k) => {
          const [y, m] = k.split('-');
          return tendencia.find((t) => t.userId === uid && t.anio === +y && t.mes === +m)?.promedio ?? null;
        }),
        borderColor: active ? this.color(idx).border : '#E2E8F0',
        backgroundColor: 'transparent',
        borderWidth: isSelected ? 2.5 : (active ? 1.5 : 0.5),
        pointRadius: isSelected ? 4 : (active ? 2 : 1),
        pointBackgroundColor: active ? this.color(idx).border : '#E2E8F0',
        pointBorderColor: '#fff',
        pointBorderWidth: isSelected ? 2 : 1,
        tension: 0.3,
        fill: false,
        spanGaps: true,
        datalabels: {
          display: isSelected,
          color: this.color(idx).border,
          font: { size: 9, weight: 'bold' as const },
          anchor: 'end' as const,
          align: 'end' as const,
          formatter: (v: number) => v?.toFixed(1) ?? '',
        },
      };
    });
    new Chart(canvasEl, {
      type: 'line',
      data: { labels: mesesLabels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#6B7280', font: { size: 9 }, boxWidth: 8, padding: 10, usePointStyle: true,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1) ?? '—'}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: '#9CA3AF',
              font: { size: 9 },
              callback: (_: any, i: number) => {
                const k = mesesKeys[i];
                const [y, m] = k.split('-');
                const mes = new Date(+y, +m - 1, 1)
                  .toLocaleString('es-PE', { month: 'short' });
                return +m === 1 ? [`${mes}.`, `${y}`] : `${mes}.`;
              },
            },
          },
          y: {
            min: 10, max: 20,
            grid: { color: '#F3F4F6' },
            ticks: { color: '#9CA3AF', font: { size: 9 }, stepSize: 2 },
          },
        },
      },
    });
  }

  selectResidenteTendencia(userId: number): void {
    this.residenteActivoTendencia = this.residenteActivoTendencia === userId ? null : userId;
    this.cdr.markForCheck();
    setTimeout(() => this.renderTendencia(), 50);
  }

  onTendenciaClick(event: MouseEvent): void {
    const chart = Chart.getChart(this.chartTendenciaId);
    if (!chart) return;
    const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, false);
    if (!points.length) {
      this.residenteActivoTendencia = null;
      this.cdr.markForCheck();
      setTimeout(() => this.renderTendencia(), 50);
      return;
    }
    const dsIdx = points[0].datasetIndex;
    const tendencia = this.dashboard!.tendencia;
    const userIds = [...new Set(tendencia.map((t) => t.userId))];
    this.selectResidenteTendencia(userIds[dsIdx]);
  }

  get hasAsignaciones(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem('allowed_features');
    return raw ? (JSON.parse(raw) as string[]).includes('evaluaciones.asignaciones') : false;
  }
}
