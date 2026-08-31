import { Component, inject, OnInit, AfterViewInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../../../environments/environment';
import { IndicadoresProactivosService } from '../../indicadores-proactivos.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  PuntajeMesDto,
  IndicadorProactivoProyectoDto,
  IndicadorReactivoProyectoDto,
  MetaAnualDto,
} from '../../indicadores-proactivos.dtos';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

Chart.register(...registerables, ChartDataLabels);

interface DesempenoSupervisorDto {
  proyectoId: number;
  pctGeneral: number;
}

@Component({
  selector: 'app-dashboard-acumulado',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './dashboard-acumulado.component.html',
  styleUrls: ['./dashboard-acumulado.component.css'],
})
export class DashboardAcumuladoComponent implements OnInit, AfterViewInit {
  private svc = inject(IndicadoresProactivosService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private http = inject(HttpClient);

  private baseSupervisor = `${environment.apiUrl}api/v1/ssoma-desempeno-supervisor`;

  @ViewChild('accDiasCanvas') accDiasCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('panoramaCanvas') panoramaCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('supervisorCanvas') supervisorCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('proactivosCanvas') proactivosCanvasRef?: ElementRef<HTMLCanvasElement>;
  private accDiasChart: Chart | null = null;
  private panoramaChart: Chart | null = null;
  private supervisorChart: Chart | null = null;
  private proactivosChart: Chart | null = null;

  mes = signal<number>(new Date().getMonth() + 1);
  anio = signal<number>(new Date().getFullYear());
  puntajes = signal<PuntajeMesDto[]>([]);
  seguimiento = signal<IndicadorProactivoProyectoDto[]>([]);
  reactivos = signal<IndicadorReactivoProyectoDto[]>([]);
  desempenoSupervisor = signal<DesempenoSupervisorDto[]>([]);
  metaAnual = signal<MetaAnualDto | null>(null);

  // ── Edición de meta anual ────────────────────────────────────────────────
  editandoMeta = false;
  metaForm = { metaIndiceFrecuencia: null as number | null, metaIndiceGravedad: null as number | null, metaIndiceAccidentabilidad: null as number | null };

  abrirEditarMeta(): void {
    const m = this.metaAnual();
    this.metaForm = {
      metaIndiceFrecuencia: m?.metaIndiceFrecuencia ?? null,
      metaIndiceGravedad: m?.metaIndiceGravedad ?? null,
      metaIndiceAccidentabilidad: m?.metaIndiceAccidentabilidad ?? null,
    };
    this.editandoMeta = true;
  }

  guardarMeta(): void {
    this.svc.guardarMetaAnual({ anio: this.anio(), ...this.metaForm }).subscribe({
      next: (meta) => { this.metaAnual.set(meta); this.editandoMeta = false; },
      error: (err) => this.errorSvc.handleError(err),
    });
  }

  cumpleMeta(actual: number, meta: number | null | undefined): boolean | null {
    if (meta == null) return null;
    return actual <= meta;
  }

  metaClass(actual: number, meta: number | null | undefined): string {
    const cumple = this.cumpleMeta(actual, meta);
    if (cumple === null) return 'meta-chip--sin-meta';
    return cumple ? 'meta-chip--ok' : 'meta-chip--alert';
  }

  meses = [
    { valor: 1, nombre: 'Enero' },   { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },   { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },   { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];
  anios = [2024, 2025, 2026, 2027].map(a => ({ valor: a, nombre: String(a) }));

  tablaCombinada = computed(() => {
    const seg = this.seguimiento();
    const segIds = new Set(seg.map(s => s.proyectoId));
    const rx = this.reactivos();
    return [...this.puntajes()]
      .filter(p => segIds.has(p.proyectoId))
      .sort((a, b) => b.puntajeTotal - a.puntajeTotal)
      .map((p, i) => {
        const s = seg.find(x => x.proyectoId === p.proyectoId);
        const r = rx.find(x => x.proyectoId === p.proyectoId);
        return {
          ...p,
          ranking: i + 1,
          pctProactivoGeneral: s?.pctProactivoGeneral ?? 0,
          nombreCorto: this.nombreCorto(p.proyectoNombre),

          // Mes consultado
          if: +(r?.indiceFrecuencia ?? 0),
          ig: +(r?.indiceGravedad ?? 0),
          ia: +(r?.indiceAccidentabilidad ?? 0),
          hht: r?.horasHombreTrabajadas ?? 0,
          accidentes: r?.totalAccidentes ?? 0,
          diasPerdidos: r?.totalDiasPerdidos ?? 0,

          // Año consultado
          ifAnio: +(r?.indiceFrecuenciaAnio ?? 0),
          igAnio: +(r?.indiceGravedadAnio ?? 0),
          iaAnio: +(r?.indiceAccidentabilidadAnio ?? 0),
          hhtAnio: r?.horasHombreTrabajadasAnio ?? 0,
          accidentesAnio: r?.totalAccidentesAnio ?? 0,
          diasPerdidosAnio: r?.totalDiasPerdidosAnio ?? 0,

          // Histórico total del proyecto
          ifTotal: +(r?.indiceFrecuenciaTotal ?? 0),
          igTotal: +(r?.indiceGravedadTotal ?? 0),
          iaTotal: +(r?.indiceAccidentabilidadTotal ?? 0),
          hhtTotal: r?.horasHombreTrabajadasTotal ?? 0,
          accidentesTotal: r?.totalAccidentesTotal ?? 0,
          diasPerdidosTotal: r?.totalDiasPerdidosTotal ?? 0,
        };
      });
  });

  // Base ANUAL (no mensual): con HHT de un solo mes, un único accidente dispara
  // el índice de forma irreal — el año da un denominador representativo.
  reactivosTotales = computed(() => {
    const rx = this.reactivos();
    if (!rx.length) return null;
    const totalHHT = rx.reduce((s, r) => s + r.horasHombreTrabajadasAnio, 0);
    const totalAcc = rx.reduce((s, r) => s + r.totalAccidentesAnio, 0);
    const totalDias = rx.reduce((s, r) => s + r.totalDiasPerdidosAnio, 0);
    const IF = totalHHT > 0 ? +((totalAcc * 1_000_000) / totalHHT).toFixed(1) : 0;
    const IG = totalHHT > 0 ? +((totalDias * 1_000_000) / totalHHT).toFixed(1) : 0;
    const IA = +(IF * IG / 1000).toFixed(2);
    return { IF, IG, IA, totalHHT, totalAcc, totalDias };
  });

  // Promedio de desempeño de supervisores por proyecto (para el mes consultado)
  // Ordenado de mejor a peor (mayor % primero).
  supervisorPorProyecto = computed(() => {
    const data = this.desempenoSupervisor();
    const porProyecto = new Map<number, number[]>();
    for (const d of data) {
      if (!porProyecto.has(d.proyectoId)) porProyecto.set(d.proyectoId, []);
      porProyecto.get(d.proyectoId)!.push(d.pctGeneral);
    }
    return this.tablaCombinada()
      .map(row => {
        const valores = porProyecto.get(row.proyectoId) ?? [];
        const promedio = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
        return { nombreCorto: row.nombreCorto, promedio: +promedio.toFixed(1), cantidad: valores.length };
      })
      .filter(r => r.cantidad > 0)
      .sort((a, b) => b.promedio - a.promedio);
  });

  // Tabla de reactivos: ordenada de mejor a peor según IA acumulada del proyecto
  // (histórico total) — a diferencia de tablaCombinada, que ordena por puntaje.
  filasReactivos = computed(() => {
    return [...this.tablaCombinada()].sort((a, b) => {
      if (a.iaTotal !== b.iaTotal) return a.iaTotal - b.iaTotal;
      return a.accidentesTotal - b.accidentesTotal;
    });
  });

  // Gráfica de accidentes DEL MES consultado — ordenada de mejor a peor
  // (menor impacto primero).
  filasAccDias = computed(() => {
    return [...this.tablaCombinada()].sort((a, b) => {
      const impactoA = a.accidentes + a.diasPerdidos;
      const impactoB = b.accidentes + b.diasPerdidos;
      return impactoA - impactoB;
    });
  });

  // Cumplimiento proactivo por proyecto — un solo % (sin desglose Casa/Contratista).
  // Ordenado de mejor a peor.
  proactivosOrdenados = computed(() => {
    return [...this.tablaCombinada()].sort((a, b) => b.pctProactivoGeneral - a.pctProactivoGeneral);
  });

  // "Mejores proyectos" — mejor proyecto por categoría, para el resumen destacado.
  mejoresProyectos = computed(() => {
    const filas = this.tablaCombinada();
    const sup = this.supervisorPorProyecto();
    if (!filas.length) return [];

    const mejor = <T,>(arr: T[], valor: (x: T) => number) =>
      arr.reduce((best, x) => (best === null || valor(x) > valor(best) ? x : best), null as T | null);

    const mejorPuntaje = mejor(filas, r => r.puntajeTotal);
    const mejorProactivo = mejor(filas, r => r.pctProactivoGeneral);
    const mejorSupervisor = mejor(sup, r => r.promedio);
    const mejorCierreAcc = mejor(filas, r => r.pctCierreAccidentes);

    return [
      { titulo: 'PUNTAJE MENSUAL SSOMA', proyecto: mejorPuntaje?.nombreCorto ?? '—', valor: mejorPuntaje?.puntajeTotal ?? 0, max: 110, sufijo: 'pts' },
      { titulo: 'CUMPLIMIENTO PROACTIVO', proyecto: mejorProactivo?.nombreCorto ?? '—', valor: mejorProactivo?.pctProactivoGeneral ?? 0, max: 100, sufijo: '%' },
      { titulo: 'KPI SUPERVISOR', proyecto: mejorSupervisor?.nombreCorto ?? '—', valor: mejorSupervisor?.promedio ?? 0, max: 100, sufijo: '%' },
      { titulo: 'CIERRE DE ACCIDENTES', proyecto: mejorCierreAcc?.nombreCorto ?? '—', valor: mejorCierreAcc?.pctCierreAccidentes ?? 0, max: 100, sufijo: '%' },
    ];
  });

  ngOnInit(): void { this.cargar(); }
  ngAfterViewInit(): void {}

  imprimir(): void { window.print(); }

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  private getDesempenoSupervisor(mes: number, anio: number) {
    const params = new HttpParams().set('mes', mes).set('anio', anio);
    return this.http
      .get<DesempenoSupervisorDto[]>(this.baseSupervisor, { headers: this.authHeaders(), params })
      .pipe(catchError(() => of([] as DesempenoSupervisorDto[])));
  }

  cargar(): void {
    this.loader.show();
    forkJoin({
      puntajes: this.svc.getPuntajeTodos(this.mes(), this.anio()),
      seguimiento: this.svc.getSeguimiento(this.mes(), this.anio()),
      reactivos: this.svc.getReactivosTodos(this.mes(), this.anio()),
      metaAnual: this.svc.getMetaAnual(this.anio()),
      supervisor: this.getDesempenoSupervisor(this.mes(), this.anio()),
    }).subscribe({
      next: ({ puntajes, seguimiento, reactivos, metaAnual, supervisor }) => {
        this.puntajes.set(puntajes);
        this.seguimiento.set(seguimiento);
        this.reactivos.set(reactivos);
        this.metaAnual.set(metaAnual);
        this.desempenoSupervisor.set(supervisor);
        this.loader.hide();
        setTimeout(() => {
          this.renderAccDiasChart();
          this.renderPanoramaChart();
          this.renderSupervisorChart();
          this.renderProactivosChart();
        }, 50);
      },
      error: err => { this.loader.hide(); this.errorSvc.handleError(err); },
    });
  }

  private baseChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 22, right: 10 } },
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { size: 10 }, precision: 0, color: '#64748b' },
          grid: { color: '#eef2f7' },
          border: { display: false },
        },
        x: {
          ticks: { font: { size: 10.5, weight: 'bold' }, color: '#1e293b' },
          grid: { display: false },
          border: { color: '#e2e8f0' },
        },
      },
    };
  }

  // ── Gráfica: cantidad de accidentes DEL MES, en barras (sin IF/IA) ──────────
  // Los días perdidos NO van como barra propia: un solo mes con muchos días
  // (ej. 30) aplasta la escala y hace ilegibles las barras de accidentes de 1.
  // En vez de eso, se muestran como segunda línea del datalabel, arriba de la
  // MISMA barra del proyecto — se identifica al toque sin romper el gráfico.
  private renderAccDiasChart(): void {
    const canvas = this.accDiasCanvasRef?.nativeElement;
    if (!canvas) return;
    if (this.accDiasChart) { this.accDiasChart.destroy(); this.accDiasChart = null; }

    const filas = this.filasAccDias();
    if (!filas.length) return;

    this.accDiasChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: filas.map(r => r.nombreCorto),
        datasets: [
          {
            label: 'Accidentes',
            data: filas.map(r => r.accidentes),
            diasPerdidos: filas.map(r => r.diasPerdidos),
            backgroundColor: '#dc2626',
            borderRadius: 4,
            maxBarThickness: 30,
            categoryPercentage: 0.55,
            barPercentage: 0.85,
          } as any,
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 26, right: 6 } },
        plugins: {
          legend: { display: false },
          datalabels: {
            display: (ctx: any) => {
              const dias = ctx.dataset.diasPerdidos?.[ctx.dataIndex] ?? 0;
              return ctx.dataset.data[ctx.dataIndex] > 0 || dias > 0;
            },
            align: 'top',
            anchor: 'end',
            color: ((ctx: any) => {
              const dias = ctx.dataset.diasPerdidos?.[ctx.dataIndex] ?? 0;
              return dias > 0 ? ['#1e293b', '#d97706'] : '#1e293b';
            }) as any,
            font: ((ctx: any) => {
              const dias = ctx.dataset.diasPerdidos?.[ctx.dataIndex] ?? 0;
              return dias > 0
                ? [{ size: 10.5, weight: 'bold' }, { size: 9, weight: 'bold' }]
                : { size: 10.5, weight: 'bold' };
            }) as any,
            formatter: (v: number, ctx: any) => {
              const dias = ctx.dataset.diasPerdidos?.[ctx.dataIndex] ?? 0;
              if (dias > 0) return [`${v}`, `⏱ ${dias} días`];
              return v > 0 ? `${v}` : '';
            },
          } as any,
        },
        scales: {
          y: { beginAtZero: true, suggestedMax: 2, ticks: { font: { size: 10 }, precision: 0, color: '#64748b' }, grid: { color: '#eef2f7' }, border: { display: false } },
          x: { ticks: { font: { size: 10.5, weight: 'bold' }, color: '#1e293b' }, grid: { display: false }, border: { color: '#e2e8f0' } },
        },
      },
    });
  }

  // ── Puntaje mensual SSOMA: puntaje total por proyecto (máx. 110 pts) ───────
  private renderPanoramaChart(): void {
    const canvas = this.panoramaCanvasRef?.nativeElement;
    if (!canvas) return;
    if (this.panoramaChart) { this.panoramaChart.destroy(); this.panoramaChart = null; }

    const filas = this.tablaCombinada();
    if (!filas.length) return;

    this.panoramaChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: filas.map(r => r.nombreCorto),
        datasets: [{
          label: 'Puntaje',
          data: filas.map(r => r.puntajeTotal),
          backgroundColor: filas.map(r => this.scoreColor(r.puntajeTotal)),
          borderRadius: 5,
          maxBarThickness: 30,
        }],
      },
      options: {
        ...this.baseChartOptions(),
        plugins: {
          legend: { display: false },
          datalabels: {
            align: 'top', anchor: 'end', color: '#1e293b',
            font: { size: 10.5, weight: 'bold' },
            formatter: (v: number) => v.toFixed(0),
          },
        },
        scales: {
          ...this.baseChartOptions().scales,
          y: { ...this.baseChartOptions().scales.y, suggestedMax: 110 },
        },
      },
    });
  }

  // ── Desempeño de supervisores: ranking por proyecto ─────────────────────────
  // Mismos colores semáforo que el resto del dashboard (verde/ámbar/rojo) —
  // nada de oro/plata/bronce, que quedaba inconsistente con el resto.
  private renderSupervisorChart(): void {
    const canvas = this.supervisorCanvasRef?.nativeElement;
    if (!canvas) return;
    if (this.supervisorChart) { this.supervisorChart.destroy(); this.supervisorChart = null; }

    const filas = this.supervisorPorProyecto();
    if (!filas.length) return;

    this.supervisorChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: filas.map((r, i) => `${i + 1}. ${r.nombreCorto}`),
        datasets: [{
          label: 'Desempeño',
          data: filas.map(r => r.promedio),
          backgroundColor: filas.map(r => this.scoreColor(r.promedio)),
          borderRadius: 5,
          maxBarThickness: 26,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 30, top: 4, bottom: 4 } },
        plugins: {
          legend: { display: false },
          datalabels: {
            align: 'end', anchor: 'end', color: '#1e293b',
            font: { size: 11, weight: 'bold' },
            formatter: (v: number) => `${v.toFixed(0)}%`,
          },
        },
        scales: {
          x: { beginAtZero: true, suggestedMax: 100, ticks: { font: { size: 10 }, color: '#64748b' }, grid: { color: '#eef2f7' }, border: { display: false } },
          y: { ticks: { font: { size: 10.5, weight: 'bold' }, color: '#1e293b' }, grid: { display: false }, border: { color: '#e2e8f0' } },
        },
      },
    });
  }

  // ── Cumplimiento proactivo por proyecto (un solo %, sin desglose) ──────────
  private renderProactivosChart(): void {
    const canvas = this.proactivosCanvasRef?.nativeElement;
    if (!canvas) return;
    if (this.proactivosChart) { this.proactivosChart.destroy(); this.proactivosChart = null; }

    const filas = this.proactivosOrdenados();
    if (!filas.length) return;

    const ctx = canvas.getContext('2d')!;
    const barra = (color: string, colorClaro: string) => {
      const g = ctx.createLinearGradient(0, 0, canvas.width || 260, 0);
      g.addColorStop(0, colorClaro);
      g.addColorStop(1, color);
      return g;
    };
    const gradientFor = (v: number) =>
      v >= 90 ? barra('#059669', '#34d399') : v >= 70 ? barra('#d97706', '#fbbf24') : barra('#dc2626', '#f87171');

    this.proactivosChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: filas.map(r => r.nombreCorto),
        datasets: [{
          label: 'Cumplimiento',
          data: filas.map(r => r.pctProactivoGeneral),
          backgroundColor: filas.map(r => gradientFor(r.pctProactivoGeneral)),
          borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 6, bottomRight: 6 },
          maxBarThickness: 22,
          categoryPercentage: 0.68,
          barPercentage: 0.82,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 32, top: 4, bottom: 4 } },
        plugins: {
          legend: { display: false },
          datalabels: {
            align: 'end', anchor: 'end', color: '#1e293b',
            font: { size: 11, weight: 'bold' },
            formatter: (v: number) => `${v.toFixed(0)}%`,
          },
        },
        scales: {
          x: { beginAtZero: true, suggestedMax: 100, ticks: { font: { size: 10 }, color: '#94a3b8' }, grid: { color: '#f1f5f9' }, border: { display: false } },
          y: { ticks: { font: { size: 10.5, weight: 'bold' }, color: '#1e293b' }, grid: { display: false }, border: { color: '#e2e8f0' } },
        },
      },
    });
  }

  private scoreColor(pts: number): string {
    if (pts >= 90) return '#059669';
    if (pts >= 70) return '#d97706';
    return '#dc2626';
  }

  nombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre ?? '';
  }

  nombreCorto(nombre: string): string {
    const w = nombre.trim().split(/\s+/);
    return w.length === 1 ? nombre.substring(0, 12) : w.slice(0, 2).join(' ');
  }

  // ── Reactivos (mayor = peor) ─────────────────────────────────────────────
  ifColorClass(val: number): string {
    if (val === 0) return 'rx--cero';
    return val <= 5 ? 'rx--ok' : val <= 15 ? 'rx--warn' : 'rx--alert';
  }
  igColorClass(val: number): string {
    if (val === 0) return 'rx--cero';
    return val <= 100 ? 'rx--ok' : val <= 250 ? 'rx--warn' : 'rx--alert';
  }
  iaColorClass(val: number): string {
    if (val === 0) return 'rx--cero';
    return val <= 2 ? 'rx--ok' : val <= 5 ? 'rx--warn' : 'rx--alert';
  }
}
