import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  ProjectsDashboardService,
  ProjectsDashboardParams,
} from './services/projects-dashboard.service';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import {
  ProjectsDashboardDTO,
  ProjectsDashboardResponseDto,
  ProjectsDashboardFilterItemDTO,
  ProjectsDashboardItemDTO,
  ProyectoDetalleDTO,
  ResponsableSimpleDTO,
} from './dtos/projectsDashboard.model';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';

import { PROJECTS_TABS } from '../shared/projects-tabs';
Chart.register(...registerables, ChartDataLabels);
declare const gantt: any;

@Component({
  selector: 'app-projects-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, AbrilPageHeaderComponent],
  templateUrl: './projects-dashboard.html',
  styleUrl: './projects-dashboard.css',
})
export class ProjectsDashboard implements OnInit, OnDestroy {
  readonly tabs = PROJECTS_TABS;
  anioActual = new Date().getFullYear();

  @ViewChild('donutCanvas') donutCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('barrasCanvas') barrasCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('ganttPanel') ganttPanelRef?: ElementRef<HTMLDivElement>;

  loading = false;
  data: ProjectsDashboardDTO | null = null;

  // Opciones de filtros
  proyectos: ProjectsDashboardFilterItemDTO[] = [];
  estados: string[] = [];
  responsables: ResponsableSimpleDTO[] = [];
  especialidades: string[] = [];

  // Filtros seleccionados
  selectedProyectoId: number | null = null;
  selectedEstado = '';
  selectedResponsableId: number | null = null;
  selectedEspecialidad = '';
  fechaDesde = '';
  fechaHasta = '';

  // Panel lateral
  panelOpen = false;
  panelLoading = false;
  selectedProyecto: ProjectsDashboardItemDTO | null = null;
  detalle: ProyectoDetalleDTO | null = null;
  activeTab: 'gantt' | 'actividades' = 'gantt';

  // Chart instances
  private donutChart: Chart | null = null;
  private barrasChart: Chart | null = null;
  private ganttInitialized = false;

  donutEmpty = false;
  barrasEmpty = false;

  constructor(
    private service: ProjectsDashboardService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getDashboard({}).subscribe({
      next: (res: ProjectsDashboardResponseDto) => {
        this.proyectos      = res.filtros.proyectos      ?? [];
        this.estados        = res.filtros.estados        ?? [];
        this.responsables   = res.filtros.responsables   ?? [];
        this.especialidades = res.filtros.especialidades ?? [];
        this.data = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.scheduleChartInit();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
      },
    });
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  applyFilters(): void {
    this.loadDashboard();
  }

  clearFilters(): void {
    this.selectedProyectoId = null;
    this.selectedEstado = '';
    this.selectedResponsableId = null;
    this.selectedEspecialidad = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.loadDashboard();
  }

  openPanel(item: ProjectsDashboardItemDTO): void {
    this.selectedProyecto = item;
    this.panelOpen = true;
    this.panelLoading = true;
    this.detalle = null;
    this.activeTab = 'gantt';
    this.ganttInitialized = false;

    this.service.getProjectDetail(item.proyectoId).subscribe({
      next: (detalle) => {
        this.detalle = detalle;
        this.panelLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initGantt(), 200);
      },
      error: (err: HttpErrorResponse) => {
        this.panelLoading = false;
        this.errorService.handleError(err);
      },
    });
  }

  closePanel(): void {
    this.panelOpen = false;
    this.selectedProyecto = null;
    this.detalle = null;
    this.ganttInitialized = false;
  }

  semaforoClass(semaforo: string | undefined): string {
    if (semaforo === 'amarillo') return 'sem-amarillo';
    if (semaforo === 'rojo') return 'sem-rojo';
    return 'sem-verde';
  }

  semaforoLabel(semaforo: string | undefined): string {
    if (semaforo === 'amarillo') return 'En riesgo';
    if (semaforo === 'rojo') return 'Retrasado';
    return 'En tiempo';
  }

  chipBySemaforo(semaforo: string | undefined): string {
    if (semaforo === 'rojo') return 'chip-red';
    if (semaforo === 'amarillo') return 'chip-orange';
    return 'chip-green';
  }

  avanceFillClass(semaforo: string | undefined): string {
    if (semaforo === 'rojo') return 'fill-rojo';
    if (semaforo === 'amarillo') return 'fill-amarillo';
    return 'fill-verde';
  }

  avanceBarWidth(value: number | undefined): string {
    return `${Math.min(100, Math.max(0, value ?? 0))}%`;
  }

  get heatmapSemanas(): string[] {
    return this.data?.heatmapCarga?.[0]?.semanas?.map((s) => s.semana) ?? [];
  }

  get heatmapMax(): number {
    if (!this.data?.heatmapCarga?.length) return 1;
    let max = 0;
    for (const row of this.data.heatmapCarga) {
      for (const s of row.semanas ?? []) {
        if (s.cantidad > max) max = s.cantidad;
      }
    }
    return max || 1;
  }

  heatmapCellBg(cantidad: number): string {
    if (!cantidad) return '#f1f5f9';
    const t = Math.min(1, cantidad / this.heatmapMax);
    const r = Math.round(255 + (37 - 255) * t);
    const g = Math.round(255 + (150 - 255) * t);
    const b = Math.round(255 + (190 - 255) * t);
    return `rgb(${r},${g},${b})`;
  }

  heatmapCellFg(cantidad: number): string {
    return Math.min(1, cantidad / this.heatmapMax) > 0.52 ? '#ffffff' : '#374151';
  }

  private loadDashboard(): void {
    this.loading = true;
    this.loaderService.show();
    const params: ProjectsDashboardParams = {
      proyectoId: this.selectedProyectoId,
      estado: this.selectedEstado || undefined,
      responsableId: this.selectedResponsableId,
      fechaDesde: this.fechaDesde || undefined,
      fechaHasta: this.fechaHasta || undefined,
    };
    this.service.getDashboard(params).subscribe({
      next: (res: ProjectsDashboardResponseDto) => {
        this.proyectos      = res.filtros.proyectos      ?? [];
        this.estados        = res.filtros.estados        ?? [];
        this.responsables   = res.filtros.responsables   ?? [];
        this.especialidades = res.filtros.especialidades ?? [];
        this.data = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.scheduleChartInit();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
      },
    });
  }

  private scheduleChartInit(): void {
    this.donutEmpty = false;
    this.barrasEmpty = false;
    setTimeout(() => {
      this.initDonutChart();
      this.initBarrasChart();
    }, 80);
  }

  private destroyCharts(): void {
    this.donutChart?.destroy();
    this.donutChart = null;
    this.barrasChart?.destroy();
    this.barrasChart = null;
  }

  private initDonutChart(): void {
    if (!this.donutCanvasRef) return;
    this.donutChart?.destroy();
    const dist = this.data?.distribucionPorEstado ?? [];
    this.donutEmpty = !dist.length;
    if (!dist.length) return;

    this.donutChart = new Chart(this.donutCanvasRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: dist.map((d) => d.estado),
        datasets: [
          {
            data: dist.map((d) => d.cantidad),
            backgroundColor: ['#2596be', '#63bf03', '#f59e0b', '#8b5cf6', '#ef4444'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 11 },
              padding: 14,
              usePointStyle: true,
              pointStyleWidth: 8,
            },
          },
          datalabels: {
            formatter: (value: any, ctx: any) => {
              const total = (ctx.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return pct >= 5 ? `${pct}%` : '';
            },
            color: '#ffffff',
            font: { size: 11, weight: 'bold' as const },
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.label}: ${ctx.raw} proyectos`,
            },
          },
        },
      },
    });
  }

  private initBarrasChart(): void {
    if (!this.barrasCanvasRef) return;
    this.barrasChart?.destroy();
    const items = (this.data?.proyectos ?? []).slice(0, 12);
    this.barrasEmpty = !items.length;
    if (!items.length) return;

    const labels = items.map((p) => {
      const nombre = p.projectDescription ?? '';
      return nombre.length > 24 ? nombre.slice(0, 24) + '…' : nombre;
    });
    const progData = items.map((p) => p.avanceProgramado ?? 0);
    const realData = items.map((p) => p.avanceReal ?? 0);
    const semColors = items.map((p) => {
      if (p.semaforo === 'verde') return '#63bf03';
      if (p.semaforo === 'amarillo') return '#f59e0b';
      return '#ef4444';
    });

    this.barrasChart = new Chart(this.barrasCanvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Programado',
            data: progData,
            backgroundColor: 'rgba(37,150,190,0.18)',
            borderColor: '#2596be',
            borderWidth: 1.5,
            borderRadius: 3,
          },
          {
            label: 'Real',
            data: realData,
            backgroundColor: semColors.map((c) => c + 'cc'),
            borderColor: semColors,
            borderWidth: 1.5,
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        scales: {
          x: {
            min: 0,
            max: 100,
            ticks: { callback: (v: any) => `${v}%`, font: { size: 10 } },
            grid: { color: '#f3f4f6' },
          },
          y: { ticks: { font: { size: 10 } }, grid: { display: false } },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 11 }, usePointStyle: true, pointStyleWidth: 8 },
          },
          datalabels: {
            anchor: 'end' as const,
            align: 'end' as const,
            formatter: (v: any) => `${(v as number).toFixed(1)}%`,
            font: { size: 9 },
            color: '#6b7280',
            clip: false,
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.dataset.label}: ${(ctx.raw as number).toFixed(1)}%`,
            },
          },
        },
      },
    });
  }

  private initGantt(): void {
    const el = this.ganttPanelRef?.nativeElement;
    if (!el || !this.detalle?.gantt) return;
    try {
      gantt.clearAll();
      if (this.ganttInitialized) {
        gantt.destructor();
        this.ganttInitialized = false;
      }
      gantt.config.date_format = '%d-%m-%Y %H:%i';
      gantt.config.readonly = true;
      gantt.config.fit_tasks = true;
      gantt.config.scale_unit = 'day';
      gantt.config.date_scale = '%d %M';
      gantt.config.min_column_width = 60;
      gantt.config.row_height = 34;
      gantt.config.bar_height = 20;
      gantt.config.show_grid = true;
      gantt.config.grid_width = 200;
      gantt.config.columns = [
        { name: 'text', label: 'Actividad', width: 180, tree: true },
        { name: 'duration', label: 'Días', width: 40, align: 'center' },
      ];
      gantt.templates.task_class = (start: Date, end: Date, task: any) => {
        if (task.progress >= 1) return 'gantt-culminado';
        if (end < new Date()) return 'gantt-vencido';
        if (start <= new Date()) return 'gantt-en-proceso';
        return 'gantt-pendiente';
      };
      gantt.templates.task_text = (_start: Date, _end: Date, task: any) => task.text;
      gantt.init(el);
      this.ganttInitialized = true;
      gantt.parse({
        data: this.detalle.gantt.tasks,
        links: this.detalle.gantt.links ?? [],
      });
    } catch (e) {
      console.warn('[Dashboard Gantt]', e);
    }
  }
}
