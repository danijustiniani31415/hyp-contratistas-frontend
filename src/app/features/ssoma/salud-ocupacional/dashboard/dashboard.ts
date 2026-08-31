import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { Router, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { DashboardSaludService } from '../services/dashboard-salud.service';
import { SSOMA_TABS } from '../shared/salud-ocupacional-tabs';
import { DashboardSaludOcupacionalDto } from '../dtos/dashboard-salud.model';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import {
  APTITUD_CHART_ORDER,
  SIN_EMO_COLOR,
  SIN_EMO_LABEL,
  aptitudDotColor,
} from '../shared/aptitud.utils';
import {
  diasVencerBadgeClass,
  diasVencerStyle,
} from '../shared/dias-vencer.utils';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-salud-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AbrilPageHeaderComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  readonly tabs = SSOMA_TABS;
  anioActual = new Date().getFullYear();
  data: DashboardSaludOcupacionalDto | null = null;
  loading = false;
  errorMsg: string | null = null;

  private aptitudChart?: Chart;
  @ViewChild('aptitudCanvas') aptitudCanvasRef?: ElementRef<HTMLCanvasElement>;

  constructor(
    private service: DashboardSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    if (this.data) this.renderAptitudChart();
  }

  ngOnDestroy(): void {
    this.aptitudChart?.destroy();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = null;
    this.loaderService.show();
    this.service.getDashboard().subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.renderAptitudChart();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorMsg = 'No se pudo cargar el dashboard';
        this.errorService.handleError(err);
      },
    });
  }

  get emosVigentes(): number {
    if (!this.data) return 0;
    return this.data.emosPorAptitud.apto + this.data.emosPorAptitud.aptoConRestricciones;
  }

  get totalPorVencer(): number {
    if (!this.data) return 0;
    const v = this.data.emosPorVencer;
    return v.dias30 + v.dias15 + v.dias7;
  }

  get porVencerTooltip(): string {
    if (!this.data) return '';
    const v = this.data.emosPorVencer;
    return `30 d: ${v.dias30} · 15 d: ${v.dias15} · 7 d: ${v.dias7}`;
  }

  diasBadge(dias: number): string {
    return diasVencerBadgeClass(dias);
  }

  diasLabel(dias: number): string {
    return diasVencerStyle(dias).label;
  }

  irAEmosWorker(workerId: number): void {
    this.router.navigate(['/ssoma/salud-ocupacional/emos', workerId, 'historial']);
  }

  irAInterconsultas(): void {
    this.router.navigate(['/ssoma/salud-ocupacional/interconsultas']);
  }

  irAProgramaciones(): void {
    this.router.navigate(['/ssoma/salud-ocupacional/programaciones']);
  }

  private renderAptitudChart(): void {
    if (!this.data || !this.aptitudCanvasRef) return;

    const ap = this.data.emosPorAptitud;
    const labels = [...APTITUD_CHART_ORDER, SIN_EMO_LABEL];
    const values = [
      ap.apto,
      ap.aptoConRestricciones,
      ap.noApto,
      ap.observado,
      ap.sinEmo,
    ];
    const colors = [
      aptitudDotColor('Apto'),
      aptitudDotColor('Apto con Restricciones'),
      aptitudDotColor('No Apto'),
      aptitudDotColor('Observado'),
      SIN_EMO_COLOR,
    ];

    this.aptitudChart?.destroy();

    const total = values.reduce((acc, v) => acc + v, 0);

    this.aptitudChart = new Chart(this.aptitudCanvasRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          datalabels: {
            display: total > 0,
            color: '#ffffff',
            font: { size: 11, weight: 'bold' },
            formatter: (value: number) =>
              total ? `${Math.round((value / total) * 100)}%` : '',
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed}`,
            },
          },
        },
      },
    });
  }
}
