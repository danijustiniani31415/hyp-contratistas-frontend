import {
  Component,
  AfterViewInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { LessonsDashboardService } from '../services/lessons-dashboard.service';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { MultiSearchSelect } from '../../../../../shared/components/multi-search-select/multi-search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import {
  LessonsDashboardDataDTO,
  LessonsDashboardFiltersDTO,
  PhaseStageChartDTO,
  SelectedDashboardFilters,
} from '../dtos/dashboard.model';
import {
  LessonAreaConfigItemDto,
  LessonAreaSegmentDto,
} from '../../configuration/lesson-areas/dtos/lesson-area.dto';

import { MEJORA_CONTINUA_TABS } from '../../../shared/mejora-continua-tabs';
Chart.register(...registerables, ChartDataLabels);

/** Nodo del árbol de áreas para el filtro en cascada (misma lógica que Lecciones Aprendidas). */
interface AreaTreeNode {
  id: number;
  name: string;
  typeName: string;
  lessonAreaId?: number;
  children: AreaTreeNode[];
}

@Component({
  selector: 'app-lessons-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, MultiSearchSelect, AbrilPageHeaderComponent],
  templateUrl: './lessons-dashboard.html',
  styleUrl: './lessons-dashboard.css',
})
export class LessonsDashboard implements AfterViewInit {
  readonly tabs = MEJORA_CONTINUA_TABS;
  anioActual = new Date().getFullYear();
  trendChart?: Chart;
  barChart?: Chart;
  userChart?: Chart;
  pieChart?: Chart;
  lineChart?: Chart;
  phaseStageCharts: PhaseStageChartDTO[] = [];

  readonly colors = [
    '#d1ebb4', '#c1e49b', '#b2de82', '#a2d768', '#93d04f', '#83c936',
    '#74c31d', '#5aa904', '#509603', '#468403', '#3c7102', '#325e02',
    '#284b02', '#1e3801', '#142601', '#0a1300',
  ];
  // Colores saturados: se usan como borde fuerte de los gráficos circulares y como
  // punto de color en las leyendas; el relleno se obtiene pastelizándolos con pastel().
  readonly doughnutColors = ['#64BC04', '#0086A5', '#5B6CC4', '#F9A826', '#EAB308', '#EC6A8A'];

  /** Aclara un color hex mezclándolo con blanco para obtener un relleno pastel. */
  private pastel(hex: string, amount = 0.6): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const mix = (c: number) => Math.round(c + (255 - c) * amount);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  }

  data?: LessonsDashboardDataDTO;
  filters: LessonsDashboardFiltersDTO = { periods: [], users: [], areas: [], projects: [], obraOficinaStaff: [] };
  // approvalStatus arranca en 'APROBADA': al cargar el dashboard solo se muestran
  // las lecciones aprobadas (el usuario puede cambiarlo a otro estado o a todos).
  selected: SelectedDashboardFilters = { periodDate: null, userId: 0, lessonAreaIds: [], obraOficinaStaffId: null, projectIds: [], approvalStatus: 'APROBADA' };

  /**
   * Opciones del filtro Obra / Oficina (con el "Todos" inicial). Reemplaza al nivel
   * "Subárea" de la cascada de áreas, que salía de los nodos de tipo "Área Obra_Oficina".
   */
  obraOficinaOptions: { obraOficinaStaffId: number | null; name: string }[] = [];

  /** Filtros avanzados (Usuario, Proyectos) colapsados tras "Búsqueda avanzada". */
  showFilters = false;

  // Opciones del filtro de estado de aprobación (igual que en Lecciones Aprendidas).
  approvalStatusOptions = [
    { value: null, label: 'Todos los estados' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'APROBADA', label: 'Aprobada' },
    { value: 'RECHAZADA', label: 'Rechazada' },
  ];

  // ── Filtro de área en cascada (misma lógica que Lecciones Aprendidas) ──────
  private areaTreeRoots: AreaTreeNode[] = [];
  areaLevels: AreaTreeNode[][] = [];
  selectedAreaNodes: (AreaTreeNode | undefined)[] = [];
  private areaNodeSeq = 0;

  // Opciones de período preformateadas para el search-select (value = 'yyyy-MM-dd', label = 'Mes Año', ej. "Abril 2026").
  periodOptions: { value: string; label: string }[] = [];

  /** Penúltimo mes con datos (último mes cerrado, ya que el mes en curso suele estar incompleto). */
  get penultMonth() {
    const m = this.data?.lessonsByMonth ?? [];
    return m.length >= 2 ? m[m.length - 2] : undefined;
  }

  /** Antepenúltimo mes con datos (base de comparación del penúltimo). */
  get antepenultMonth() {
    const m = this.data?.lessonsByMonth ?? [];
    return m.length >= 3 ? m[m.length - 3] : undefined;
  }

  /** Variación % del penúltimo mes vs. el antepenúltimo. null si no hay base de comparación. */
  get monthVariationPct(): number | null {
    const base = this.antepenultMonth?.value ?? 0;
    if (!this.antepenultMonth || base === 0) return null;
    const cur = this.penultMonth?.value ?? 0;
    return Math.round(((cur - base) / base) * 100);
  }

  /** Proyecto con más lecciones (lessonsByProject ya viene ordenado desc por el backend). */
  get leaderProject() {
    return this.data?.lessonsByProject?.[0];
  }

  /** Promedio de lecciones por proyecto (con al menos una lección). */
  get avgPerProject(): number {
    const projects = this.data?.lessonsByProject ?? [];
    if (!projects.length) return 0;
    const total = projects.reduce((sum, p) => sum + p.value, 0);
    return Math.round((total / projects.length) * 10) / 10;
  }

  @ViewChild('lessonsTrendChart') lessonsTrendChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lessonsChart') lessonsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lessonsUserChart') lessonsUserChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lessonsPieChart') lessonsPieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lessonsLineChart') lessonsLineChartRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private dashboardService: LessonsDashboardService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit() {
    this.loadInitial();
    this.loadAreaTree();
  }

  // ── Filtro de área en cascada (misma lógica que Lecciones Aprendidas) ──────

  private loadAreaTree(): void {
    this.dashboardService.getLessonAreasForFilter().subscribe({
      next: (data: LessonAreaConfigItemDto[]) => {
        this.areaTreeRoots = this.buildAreaTree(data.filter((d) => d.lessonAreaId != null));
        this.areaLevels = this.areaTreeRoots.length ? [this.areaTreeRoots] : [];
        this.selectedAreaNodes = this.areaTreeRoots.length ? [undefined] : [];

        // Forzar detección de cambios para que los search-select rendericen correctamente
        // cuando las opciones llegan de forma asíncrona — evita que el control quede "vacío"
        // hasta la primera interacción del usuario.
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  /** Igual que el formulario de creación: independientes como hojas de 1er nivel, resto en cascada. */
  private buildAreaTree(items: LessonAreaConfigItemDto[]): AreaTreeNode[] {
    this.areaNodeSeq = 0;

    const stripGerencia = (path: LessonAreaSegmentDto[]): LessonAreaSegmentDto[] => {
      let start = 0;
      while (start < path.length && (path[start].areaTypeName ?? '').trim() === 'Área de Gerencia') start++;
      return path.slice(start);
    };
    const keyOf = (path: LessonAreaSegmentDto[]): string =>
      path.map((s) => `${s.areaTypeName} ${s.areaItemName}`).join('');

    const independentKeys = new Set(
      items.filter((i) => i.includeAsIndependent).map((i) => keyOf(stripGerencia(i.path))),
    );

    const independentRoots: AreaTreeNode[] = [];
    const cascadeRoots: AreaTreeNode[] = [];

    for (const item of items) {
      const trimmed = stripGerencia(item.path);
      if (trimmed.length === 0) continue;

      if (item.includeAsIndependent) {
        const leaf = trimmed[trimmed.length - 1];
        independentRoots.push({
          id: ++this.areaNodeSeq,
          name: leaf.areaItemName,
          typeName: leaf.areaTypeName,
          lessonAreaId: item.lessonAreaId!,
          children: [],
        });
        continue;
      }

      let underIndependent = false;
      for (let k = 1; k < trimmed.length; k++) {
        if (independentKeys.has(keyOf(trimmed.slice(0, k)))) { underIndependent = true; break; }
      }
      if (underIndependent) continue;

      let level = cascadeRoots;
      let node: AreaTreeNode | undefined;
      for (const seg of trimmed) {
        node = level.find((n) => n.name === seg.areaItemName && n.typeName === seg.areaTypeName);
        if (!node) {
          node = { id: ++this.areaNodeSeq, name: seg.areaItemName, typeName: seg.areaTypeName, children: [] };
          level.push(node);
        }
        level = node.children;
      }
      if (node) node.lessonAreaId = item.lessonAreaId!;
    }

    return [...independentRoots, ...cascadeRoots];
  }

  onAreaNodeChange(levelIndex: number, selectedId: number | undefined): void {
    const selectedNode = selectedId
      ? this.areaLevels[levelIndex]?.find((n) => n.id === selectedId)
      : undefined;

    this.selectedAreaNodes[levelIndex] = selectedNode;
    this.areaLevels = this.areaLevels.slice(0, levelIndex + 1);
    this.selectedAreaNodes = this.selectedAreaNodes.slice(0, levelIndex + 1);

    if (selectedNode?.children?.length) {
      this.areaLevels.push(selectedNode.children);
      this.selectedAreaNodes.push(undefined);
    }

    this.syncSelectedAreaIds();
  }

  /**
   * Toma el nodo más profundo SELECCIONADO y junta todos los lesson_area_id de su
   * subárbol. Detenerte en un padre (p. ej. Unidad de Proyectos) → incluye todas sus
   * subáreas; bajar a una hoja → solo esa.
   */
  private syncSelectedAreaIds(): void {
    let deepest: AreaTreeNode | undefined;
    for (let i = this.selectedAreaNodes.length - 1; i >= 0; i--) {
      if (this.selectedAreaNodes[i]) { deepest = this.selectedAreaNodes[i]; break; }
    }
    this.selected.lessonAreaIds = deepest ? this.collectAreaIds(deepest) : [];
  }

  private collectAreaIds(node: AreaTreeNode): number[] {
    const ids: number[] = [];
    if (node.lessonAreaId) ids.push(node.lessonAreaId);
    for (const c of node.children) ids.push(...this.collectAreaIds(c));
    return ids;
  }

  private loadInitial() {
    this.loaderService.show();
    forkJoin({
      data: this.dashboardService.getData(this.selected),
      filters: this.dashboardService.getFilters(),
    }).subscribe({
      next: ({ data, filters }) => {
        this.filters = filters;
        this.obraOficinaOptions = [
          { obraOficinaStaffId: null, name: 'Todos' },
          ...(filters.obraOficinaStaff ?? []),
        ];
        this.periodOptions = (filters.periods ?? [])
          .filter((p) => p.periodDate)
          .map((p) => ({
            value: formatDate(p.periodDate!, 'yyyy-MM-dd', 'es-PE'),
            // Nombre del mes en español capitalizado, ej. "Abril 2026".
            label: formatDate(p.periodDate!, 'MMMM yyyy', 'es-PE').replace(/^./, (c) => c.toUpperCase()),
          }));
        this.render(data);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  loadDashboard() {
    this.loaderService.show();
    this.dashboardService.getData(this.selected).subscribe({
      next: (data) => {
        this.render(data);
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private render(data: LessonsDashboardDataDTO) {
    this.data = data;
    this.phaseStageCharts = data.lessonsByPhaseAndStage ?? [];
    this.createTrendChart(data);
    this.createBarChart(data);
    this.createUserChart(data);
    this.createPieChart(data);
    this.createLineChart(data);
    setTimeout(() => this.createPhaseStageCharts(this.phaseStageCharts));
    this.cdr.detectChanges();
  }

  // ── Charts ───────────────────────────────────────────────────────────────

  private createTrendChart(data: LessonsDashboardDataDTO) {
    this.trendChart?.destroy();
    const trend = data.lessonsByMonth ?? [];
    this.trendChart = new Chart(this.lessonsTrendChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: trend.map((x) => x.label),
        datasets: [
          {
            label: 'Lecciones registradas',
            data: trend.map((x) => x.value),
            backgroundColor: 'rgba(100, 188, 4, 0.12)',
            borderColor: '#64BC04',
            borderWidth: 2,
            pointBackgroundColor: '#64BC04',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          datalabels: {
            display: true,
            color: '#509603',
            anchor: 'end',
            align: 'top',
            offset: 4,
            font: { weight: 'bold', size: 11 },
            formatter: (v) => v,
          },
        },
        scales: { y: { ticks: { precision: 0 }, beginAtZero: true } },
      },
    });
  }

  private createBarChart(data: LessonsDashboardDataDTO) {
    this.barChart?.destroy();
    const sorted = [...data.lessonsByProject].sort((a, b) => b.value - a.value);
    this.barChart = new Chart(this.lessonsChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: sorted.map((x) => x.label),
        datasets: [
          {
            label: 'Lecciones aprendidas',
            data: sorted.map((x) => x.value),
            backgroundColor: '#E5F7D1',
            borderColor: '#64BC04',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: {
          datalabels: {
            color: '#828282',
            formatter: (v) => v,
            font: { weight: 'bold', size: 12 },
            anchor: 'end',
            align: 'right',
            offset: 4,
          },
          legend: { position: 'bottom' },
        },
        scales: { x: { ticks: { precision: 0 }, beginAtZero: true } },
      },
    });
  }

  private createUserChart(data: LessonsDashboardDataDTO) {
    this.userChart?.destroy();
    // Top 10 usuarios por aportes (ranking de engagement).
    const sorted = [...(data.lessonsByUser ?? [])].sort((a, b) => b.value - a.value).slice(0, 10);
    this.userChart = new Chart(this.lessonsUserChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: sorted.map((x) => x.label),
        datasets: [
          {
            label: 'Lecciones registradas',
            data: sorted.map((x) => x.value),
            backgroundColor: '#CFEAF1',
            borderColor: '#0086A5',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: {
          datalabels: {
            color: '#0086A5',
            formatter: (v) => v,
            font: { weight: 'bold', size: 12 },
            anchor: 'end',
            align: 'right',
            offset: 4,
          },
          legend: { position: 'bottom' },
        },
        scales: { x: { ticks: { precision: 0 }, beginAtZero: true } },
      },
    });
  }

  private createPieChart(data: LessonsDashboardDataDTO) {
    this.pieChart?.destroy();
    const sorted = [...data.lessonsByPhase].sort((a, b) => b.value - a.value);
    this.pieChart = new Chart(this.lessonsPieChartRef.nativeElement, {
      type: 'pie',
      data: {
        labels: sorted.map((x) => x.label),
        datasets: [
          {
            data: sorted.map((x) => x.value),
            // Relleno pastel + borde fuerte del mismo color (igual que las barras).
            backgroundColor: sorted.map((_, i) => this.pastel(this.colors[i % this.colors.length])),
            borderColor: sorted.map((_, i) => this.colors[i % this.colors.length]),
            borderWidth: 2,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          datalabels: { color: '#828282', formatter: (v) => v, font: { weight: 'bold', size: 12 } },
          legend: { position: 'bottom' },
        },
      },
    });
  }

  private createLineChart(data: LessonsDashboardDataDTO) {
    this.lineChart?.destroy();
    const sorted = [...data.lessonsBySubStage].sort((a, b) => b.value - a.value);
    this.lineChart = new Chart(this.lessonsLineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: sorted.map((x) => x.label),
        datasets: [
          {
            label: 'Lecciones aprendidas',
            data: sorted.map((x) => x.value),
            backgroundColor: '#E5F7D1',
            borderColor: '#64BC04',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          datalabels: { display: true, anchor: 'end', align: 'top', offset: 3 },
        },
        scales: { y: { ticks: { precision: 0 }, beginAtZero: true } },
      },
    });
  }

  private createPhaseStageCharts(data: PhaseStageChartDTO[]) {
    data.forEach((phase) => {
      const canvas = document.getElementById(`phaseChart-${phase.phaseId}`) as HTMLCanvasElement;
      if (!canvas) return;

      const hasData = phase.stages.length > 0;
      const labels = hasData ? phase.stages.map((s) => s.label) : ['Sin datos'];
      const values = hasData ? phase.stages.map((s) => s.value) : [1];
      // Relleno pastel + borde fuerte del mismo color (igual que las barras).
      const borders = hasData
        ? values.map((_, i) => this.doughnutColors[i % this.doughnutColors.length])
        : ['#D9DEE8'];
      const fills = hasData ? borders.map((c) => this.pastel(c)) : ['#F1F3F7'];

      // Texto "Sin datos" centrado para fases sin lecciones (al filtrar por área).
      const emptyTextPlugin = {
        id: 'emptyText',
        afterDraw(chart: any) {
          if (hasData) return;
          const { ctx, width, height } = chart;
          ctx.save();
          ctx.font = 'bold 13px sans-serif';
          ctx.fillStyle = '#9CA3AF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Sin datos', width / 2, height / 2);
          ctx.restore();
        },
      };

      Chart.getChart(canvas)?.destroy();
      new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: fills, borderColor: borders, borderWidth: 2 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: hasData },
            datalabels: {
              display: hasData,
              color: '#828282',
              formatter: (value: number, ctx: any) => `${ctx.chart.data.labels?.[ctx.dataIndex]}: ${value}`,
              font: { size: 11, weight: 'bold' },
            },
          },
        },
        plugins: hasData ? [] : [emptyTextPlugin],
      });
    });
  }

  // ── PDF ──────────────────────────────────────────────────────────────────

  /** Dibuja la cuadrícula de tarjetas resumen (4×2) en el PDF y devuelve la Y siguiente. */
  private drawSummaryCards(pdf: jsPDF, startY: number, marginX: number, usableWidth: number): number {
    const s = this.data?.summary;

    // Variación del penúltimo mes vs. antepenúltimo (sin flechas: no están en WinAnsi).
    const v = this.monthVariationPct;
    let variationText = 'sin comparación';
    let variationRgb: [number, number, number] = [156, 163, 175];
    if (v !== null) {
      const sign = v > 0 ? '+' : '';
      variationText = `${sign}${v}% vs. ${this.antepenultMonth?.label ?? ''}`;
      variationRgb = v > 0 ? [0, 156, 135] : v < 0 ? [211, 0, 0] : [156, 163, 175];
    }

    const cards: {
      label: string;
      value: string;
      rgb: [number, number, number];
      sub?: string;
      subRgb?: [number, number, number];
      small?: boolean;
    }[] = [
      { label: 'Total lecciones', value: String(s?.totalLessons ?? 0), rgb: [100, 188, 4] },
      {
        label: `Lecciones ${this.penultMonth?.label || 'mes'}`,
        value: String(this.penultMonth?.value ?? 0),
        rgb: [116, 195, 29],
        sub: variationText,
        subRgb: variationRgb,
      },
      { label: 'Proyectos', value: String(s?.totalProjects ?? 0), rgb: [0, 134, 165] },
      { label: 'Áreas', value: String(s?.totalAreas ?? 0), rgb: [80, 150, 3] },
      { label: 'Fases', value: String(s?.totalPhases ?? 0), rgb: [162, 215, 104] },
      { label: 'Usuarios', value: String(s?.totalUsers ?? 0), rgb: [60, 113, 2] },
      {
        label: 'Proyecto líder',
        value: this.leaderProject?.label || '—',
        rgb: [31, 41, 55],
        sub: this.leaderProject ? `${this.leaderProject.value} lecciones` : '',
        subRgb: [100, 188, 4],
        small: true,
      },
      { label: 'Prom. por proyecto', value: String(this.avgPerProject), rgb: [131, 201, 54] },
    ];

    const cols = 4;
    const gap = 4;
    const cardW = (usableWidth - gap * (cols - 1)) / cols;
    const cardH = 17;
    const rowGap = 4;

    cards.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = marginX + col * (cardW + gap);
      const y = startY + row * (cardH + rowGap);

      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

      // Etiqueta
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(pdf.splitTextToSize(c.label, cardW - 6)[0], x + 3, y + 5);

      // Valor
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(c.rgb[0], c.rgb[1], c.rgb[2]);
      if (c.small) {
        pdf.setFontSize(8.5);
        pdf.text(pdf.splitTextToSize(c.value, cardW - 6).slice(0, 2), x + 3, y + 9);
      } else {
        pdf.setFontSize(16);
        pdf.text(c.value, x + 3, y + 12);
      }

      // Subtexto (variación / líder)
      if (c.sub) {
        const srgb = c.subRgb ?? [156, 163, 175];
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(srgb[0], srgb[1], srgb[2]);
        pdf.text(pdf.splitTextToSize(c.sub, cardW - 6)[0], x + 3, y + cardH - 2.5);
      }
    });

    pdf.setTextColor(0, 0, 0);
    const rows = Math.ceil(cards.length / cols);
    return startY + rows * cardH + (rows - 1) * rowGap + 8;
  }

  private generatePDF(): jsPDF {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const marginX = 10;
    const usableWidth = 210 - marginX * 2;
    const halfWidth = usableWidth / 2;
    const chartHeight = 60;
    let currentY = 10;

    autoTable(pdf, {
      startY: 10,
      theme: 'grid',
      styles: { halign: 'center', valign: 'middle', fontSize: 10 },
      tableWidth: 190,
      body: [
        [
          { content: 'DASHBOARD DE LECCIONES APRENDIDAS\nUNIDAD DE PROYECTOS', styles: { fontSize: 14, fontStyle: 'bold' } },
          { content: 'Fecha: ' + new Date().toLocaleDateString() },
        ],
      ],
    });
    currentY = (pdf as any).lastAutoTable.finalY + 8;

    // Tarjetas resumen (4×2), replican las del dashboard
    currentY = this.drawSummaryCards(pdf, currentY, marginX, usableWidth);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');

    // Tendencia mensual (ancho completo)
    if (this.trendChart) {
      pdf.text('TENDENCIA MENSUAL DE LECCIONES', 105, currentY, { align: 'center' });
      currentY += 2;
      pdf.addImage(this.trendChart.toBase64Image(), 'PNG', marginX, currentY, usableWidth, 50);
      currentY += 58;
    }

    pdf.text('LECCIONES APRENDIDAS POR PROYECTO', marginX + halfWidth / 2, currentY, { align: 'center' });
    pdf.text('LECCIONES APRENDIDAS POR FASE', marginX + halfWidth + halfWidth / 2, currentY, { align: 'center' });
    currentY += 2;
    if (this.barChart) pdf.addImage(this.barChart.toBase64Image(), 'PNG', marginX, currentY, halfWidth, chartHeight);
    if (this.pieChart) {
      pdf.addImage(this.pieChart.toBase64Image(), 'PNG', marginX + halfWidth, currentY, halfWidth, chartHeight);
      currentY += 70;
    }
    pdf.text('TOP USUARIOS (RANKING DE APORTES)', marginX + halfWidth / 2, currentY, { align: 'center' });
    pdf.text('LECCIONES APRENDIDAS POR SUBETAPA / ESPECIALIDAD', marginX + halfWidth + halfWidth / 2, currentY, { align: 'center' });
    currentY += 2;
    if (this.userChart) pdf.addImage(this.userChart.toBase64Image(), 'PNG', marginX, currentY, halfWidth, chartHeight);
    if (this.lineChart) pdf.addImage(this.lineChart.toBase64Image(), 'PNG', marginX + halfWidth, currentY, halfWidth, chartHeight);

    return pdf;
  }

  downloadPDF() {
    this.generatePDF().save('Dashboard-Lecciones.pdf');
  }

  sendPDF() {
    const blob = this.generatePDF().output('blob');
    const formData = new FormData();
    formData.append('pdf', blob, 'dashboard-lecciones.pdf');

    this.loaderService.show();
    this.dashboardService.sendPdf(formData).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: 'PDF enviado exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
