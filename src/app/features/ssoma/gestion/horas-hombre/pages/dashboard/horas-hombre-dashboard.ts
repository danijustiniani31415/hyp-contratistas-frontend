import {
  AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { ProjectService } from '../../../../../../core/services/project.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { HorasHombreService } from '../../services/horas-hombre.service';
import { HorasHombreDashboardDto } from '../../dtos/horas-hombre.model';

import { HORAS_HOMBRE_TABS } from '../../horas-hombre-tabs';
Chart.register(...registerables);

interface OpcionSimple { id: number; nombre: string; }

interface RankingItem {
  nombre: string;
  horasHombre: number;
  pct: number;
}

@Component({
  selector: 'app-horas-hombre-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './horas-hombre-dashboard.html',
  styleUrl: './horas-hombre-dashboard.css',
})
export class HorasHombreDashboard implements OnInit, AfterViewInit, OnDestroy {
  readonly tabs = HORAS_HOMBRE_TABS;
  @ViewChild('chartSerie') chartSerieRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartSplit') chartSplitRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartProyecto') chartProyectoRef?: ElementRef<HTMLCanvasElement>;

  private chartSerie?: Chart;
  private chartSplit?: Chart;
  private chartProyecto?: Chart;

  rankingEmpresas: RankingItem[] = [];

  proyectos: OpcionSimple[] = [];
  proyectoId: number | null = null;
  mes: number | null = new Date().getMonth() + 1;
  anio: number | null = new Date().getFullYear();

  readonly meses = [
    { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' },
  ];
  readonly anios = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);
  readonly aniosOpciones = this.anios.map((a) => ({ value: a, label: String(a) }));

  loading = false;
  data: HorasHombreDashboardDto | null = null;
  private viewReady = false;

  constructor(
    private svc: HorasHombreService,
    private projectService: ProjectService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.projectService.getProjectsPaged({ pageSize: 300 }).subscribe({
      next: (res) => {
        this.proyectos = (res.data ?? []).map((p) => ({ id: p.projectId, nombre: p.projectDescription }));
        this.cdr.detectChanges();
      },
      error: () => { this.proyectos = []; },
    });
    this.load();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.data) this.renderCharts();
  }

  ngOnDestroy(): void {
    this.chartSerie?.destroy();
    this.chartSplit?.destroy();
    this.chartProyecto?.destroy();
  }

  irATabla(): void {
    this.router.navigate(['/ssoma/gestion/horas-hombre/tabla']);
  }

  onProyectoChange(id: number | null): void {
    this.proyectoId = id;
    this.load();
  }

  onFilter(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getDashboard(this.proyectoId, this.mes, this.anio).subscribe({
      next: (res) => {
        this.data = res;
        this.rankingEmpresas = this.buildRanking(res);
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
        if (this.viewReady) this.renderCharts();
      },
      error: (err) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private buildRanking(data: HorasHombreDashboardDto): RankingItem[] {
    const total = data.porEmpresa.reduce((sum, e) => sum + e.horasHombre, 0);
    return data.porEmpresa.slice(0, 8).map((e) => ({
      nombre: e.empresaNombre,
      horasHombre: e.horasHombre,
      pct: total > 0 ? (e.horasHombre / total) * 100 : 0,
    }));
  }

  private renderCharts(): void {
    if (!this.data) return;
    this.renderSerie();
    this.renderSplit();
    this.renderProyecto();
  }

  private renderSerie(): void {
    const ctx = this.chartSerieRef?.nativeElement;
    if (!ctx || !this.data) return;
    this.chartSerie?.destroy();
    const serie = this.data.serieDiaria;
    this.chartSerie = new Chart(ctx, {
      type: 'line',
      data: {
        labels: serie.map((d) => this.formatFechaCorta(d.fecha)),
        datasets: [
          {
            label: 'Casa',
            data: serie.map((d) => d.horasHombreCasa),
            borderColor: '#1b3a6b',
            backgroundColor: 'rgba(27,58,107,0.12)',
            tension: 0.25,
            fill: true,
          },
          {
            label: 'Contratistas',
            data: serie.map((d) => d.horasHombreContratista),
            borderColor: '#64bc04',
            backgroundColor: 'rgba(100,188,4,0.12)',
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Horas Hombre' } } },
      },
    });
  }

  private renderSplit(): void {
    const ctx = this.chartSplitRef?.nativeElement;
    if (!ctx || !this.data) return;
    this.chartSplit?.destroy();
    this.chartSplit = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Casa', 'Contratistas'],
        datasets: [{
          data: [this.data.totalHorasHombreCasa, this.data.totalHorasHombreContratista],
          backgroundColor: ['#1b3a6b', '#64bc04'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
      },
    });
  }

  private renderProyecto(): void {
    const ctx = this.chartProyectoRef?.nativeElement;
    if (!ctx || !this.data) return;
    this.chartProyecto?.destroy();
    if (!this.data.porProyecto.length) return;
    const top = [...this.data.porProyecto].slice(0, 12);
    this.chartProyecto = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map((p) => p.proyectoNombre),
        datasets: [{ label: 'Horas Hombre', data: top.map((p) => p.horasHombre), backgroundColor: '#1b3a6b' }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true },
          x: { ticks: { autoSkip: false, maxRotation: 40, minRotation: 20 } },
        },
      },
    });
  }

  private formatFechaCorta(fecha: string): string {
    const d = new Date(fecha + 'T00:00:00');
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  formatNumero(n: number): string {
    return new Intl.NumberFormat('es-PE').format(Math.round(n));
  }
}
