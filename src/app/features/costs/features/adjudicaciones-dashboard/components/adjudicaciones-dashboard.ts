import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { Roles } from '../../../../../core/constants/roles';
import { AdjudicacionesDashboardService } from '../services/adjudicaciones-dashboard.service';
import {
  AdjudicacionesDashboardDTO,
  AdjChartItemDTO,
  AdjAdvanceChartItemDTO,
  AdjDashboardFiltersDTO,
  AdjDashboardFilterValues,
} from '../dtos/adjudicaciones-dashboard.dto';

import { COSTS_TABS } from '../../../shared/costs-tabs';
Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-adjudicaciones-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './adjudicaciones-dashboard.html',
})
export class AdjudicacionesDashboard implements AfterViewInit {
  readonly tabs = COSTS_TABS;
  data?: AdjudicacionesDashboardDTO;

  /** Catálogos de los filtros (se cargan una sola vez en la primera petición). */
  filterOptions?: AdjDashboardFiltersDTO;

  /** Valores seleccionados en los filtros. */
  filters: AdjDashboardFilterValues = {
    projectId: null,
    contractTypeId: null,
    contractModalityId: null,
    paymentMethodId: null,
    projectSubContractorStatusId: null,
  };

  constructor(
    private service: AdjudicacionesDashboardService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.load(true);
  }

  /**
   * Usuario de Oficina Técnica "puro" (sin ser Admin ni Oficina Central): solo puede
   * ver el dashboard de su(s) proyecto(s) asignado(s) en Configuración → Correo de
   * staff por proyecto. Misma lógica que el backend (RestrictToOwnProjects): el
   * catálogo de proyectos que llega ya viene restringido a los suyos, así que aquí
   * solo bloqueamos el filtro para que no lo puedan cambiar a otro proyecto.
   */
  get projectLocked(): boolean {
    const roles = this.authService.getRoles();
    return (
      roles.includes(Roles.COSTOS_OFICINA_TECNICA) &&
      !roles.includes(Roles.COSTOS_ADMINISTRADOR) &&
      !roles.includes(Roles.COSTOS_OFICINA_CENTRAL)
    );
  }

  /** Aplica los filtros seleccionados y recarga todos los gráficos. */
  applyFilters(): void {
    this.load(false);
  }

  /** Limpia todos los filtros y recarga. */
  clearFilters(): void {
    this.filters = {
      // Oficina Técnica no puede quitar su proyecto: se mantiene bloqueado.
      projectId: this.projectLocked ? this.filterOptions?.projects?.[0]?.id ?? null : null,
      contractTypeId: null,
      contractModalityId: null,
      paymentMethodId: null,
      projectSubContractorStatusId: null,
    };
    this.load(false);
  }

  get hasActiveFilters(): boolean {
    return (
      this.filters.projectId != null ||
      this.filters.contractTypeId != null ||
      this.filters.contractModalityId != null ||
      this.filters.paymentMethodId != null ||
      this.filters.projectSubContractorStatusId != null
    );
  }

  /** @param includeFilters solo true en la primera carga para traer los catálogos de filtros. */
  private load(includeFilters: boolean): void {
    this.loaderService.show();
    this.service.getDashboard(this.filters, includeFilters).subscribe({
      next: (res) => {
        this.data = res;
        if (res.filters) {
          this.filterOptions = res.filters;
          // Oficina Técnica: el catálogo ya viene con solo su(s) proyecto(s).
          // Dejamos el filtro marcado en su proyecto y bloqueado (ver template).
          if (this.projectLocked && res.filters.projects?.length) {
            this.filters.projectId = res.filters.projects[0].id;
          }
        }
        this.loaderService.hide();
        this.cdr.detectChanges();
        setTimeout(() => this.renderAll());
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private renderAll(): void {
    if (!this.data) return;
    this.barChart('chart-estado', this.data.porEstado, '#0086A5', '#CFEAF1', true);
    // Pendientes por trabajador de OT (naranja = color de OT en el stepper del detalle).
    this.barChart('chart-pendientes-ot-2', this.data.pendientesOtPaso2, '#F59E0B', '#FDEBC8', true);
    this.barChart('chart-pendientes-ot-4', this.data.pendientesOtPaso4, '#F59E0B', '#FDEBC8', true);
    // Rankings (barras horizontales).
    this.barChart('chart-top-pen', this.data.topSubcontratistasPen, '#509603', '#E5F7D1', true, true);
    this.barChart('chart-top-usd', this.data.topSubcontratistasUsd, '#0086A5', '#CFEAF1', true, true);
    // Solo contratos con adelanto (Contrato con adelanto / Pago a cuenta): total vs adelanto.
    this.dualBarChart('chart-top-adelanto-pen', this.data.topSubcontratistasAdelantoPen, '#509603', '#E5F7D1');
    this.dualBarChart('chart-top-adelanto-usd', this.data.topSubcontratistasAdelantoUsd, '#0086A5', '#CFEAF1');
  }

  /** Aclara un color hex mezclándolo con blanco para obtener un relleno pastel. */
  private pastel(hex: string, amount = 0.6): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const mix = (c: number) => Math.round(c + (255 - c) * amount);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  }

  /** Formato de monto compacto para etiquetas (1.2K, 3.4M). */
  private formatMoney(v: number): string {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(v);
  }

  // ── Charts ───────────────────────────────────────────────────────────────

  private barChart(
    canvasId: string,
    items: AdjChartItemDTO[],
    border: string,
    bg: string,
    horizontal: boolean,
    money = false,
  ): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    Chart.getChart(canvas)?.destroy();
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map((i) => i.label),
        datasets: [
          { label: 'Adjudicaciones', data: items.map((i) => i.value), backgroundColor: bg, borderColor: border, borderWidth: 2 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        layout: { padding: { right: money ? 28 : 8 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              ...(money ? { label: (ctx) => ` ${(ctx.raw as number).toLocaleString('es-PE')}` } : {}),
              // Detalle breve por barra (solo los ítems que traen `items`, hoy porEstado):
              // lista de adjudicaciones en ese estado, recortada para no tapar la pantalla.
              afterBody: (ctxs) => {
                const detail = items[ctxs[0]?.dataIndex ?? -1]?.items;
                if (!detail?.length) return [];
                const max = 10;
                const lines = detail.slice(0, max).map((s) => `• ${s}`);
                if (detail.length > max) lines.push(`… y ${detail.length - max} más`);
                return lines;
              },
            },
            bodyFont: { size: 11 },
          },
          datalabels: {
            color: '#5b6470',
            font: { weight: 'bold', size: 11 },
            anchor: 'end',
            align: horizontal ? 'right' : 'top',
            offset: 2,
            formatter: (v: number) => (v > 0 ? (money ? this.formatMoney(v) : v) : ''),
          },
        },
        scales: horizontal
          ? { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { ticks: { font: { size: 10 } } } }
          : { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }

  /**
   * Barras horizontales dobles por subcontratista: monto total adjudicado y monto del adelanto.
   * El adelanto siempre va en ámbar para distinguirlo del total en ambas monedas.
   */
  private dualBarChart(
    canvasId: string,
    items: AdjAdvanceChartItemDTO[],
    border: string,
    bg: string,
  ): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const advanceBorder = '#F9A826';
    Chart.getChart(canvas)?.destroy();
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map((i) => i.label),
        datasets: [
          {
            label: 'Monto total',
            data: items.map((i) => i.total),
            backgroundColor: bg,
            borderColor: border,
            borderWidth: 2,
          },
          {
            label: 'Adelanto',
            data: items.map((i) => i.advance),
            backgroundColor: this.pastel(advanceBorder),
            borderColor: advanceBorder,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        layout: { padding: { right: 28 } },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { boxWidth: 10, padding: 8, font: { size: 10 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.raw as number).toLocaleString('es-PE')}`,
            },
            bodyFont: { size: 11 },
          },
          datalabels: {
            color: '#5b6470',
            font: { weight: 'bold', size: 10 },
            anchor: 'end',
            align: 'right',
            offset: 2,
            formatter: (v: number) => (v > 0 ? this.formatMoney(v) : ''),
          },
        },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } },
          y: { ticks: { font: { size: 10 } } },
        },
      },
    });
  }

  // ── PDF ──────────────────────────────────────────────────────────────────

  /** Imagen base64 de un gráfico a partir del id de su canvas (o null si no existe). */
  private chartImage(canvasId: string): string | null {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return null;
    return Chart.getChart(canvas)?.toBase64Image() ?? null;
  }

  /** Dibuja la cuadrícula de tarjetas resumen (6 KPIs) en el PDF y devuelve la Y siguiente. */
  private drawSummaryCards(pdf: jsPDF, startY: number, marginX: number, usableWidth: number): number {
    const s = this.data?.summary;
    const nf = (v: number) => (v ?? 0).toLocaleString('es-PE');

    const cards: { label: string; value: string; rgb: [number, number, number] }[] = [
      { label: 'Total', value: nf(s?.total ?? 0), rgb: [31, 41, 55] },
      { label: 'En proceso', value: nf(s?.enProceso ?? 0), rgb: [0, 134, 165] },
      { label: 'Completadas', value: nf(s?.completadas ?? 0), rgb: [100, 188, 4] },
      { label: 'Proyectos', value: nf(s?.totalProyectos ?? 0), rgb: [31, 41, 55] },
      { label: 'Monto S/.', value: nf(s?.montoPenTotal ?? 0), rgb: [80, 150, 3] },
      { label: 'Monto $', value: nf(s?.montoUsdTotal ?? 0), rgb: [80, 150, 3] },
    ];

    const cols = 6;
    const gap = 4;
    const cardW = (usableWidth - gap * (cols - 1)) / cols;
    const cardH = 17;

    cards.forEach((c, i) => {
      const x = marginX + i * (cardW + gap);
      const y = startY;

      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(pdf.splitTextToSize(c.label, cardW - 6)[0], x + 3, y + 5);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(c.rgb[0], c.rgb[1], c.rgb[2]);
      pdf.setFontSize(13);
      pdf.text(pdf.splitTextToSize(c.value, cardW - 6)[0], x + 3, y + 12);
    });

    pdf.setTextColor(0, 0, 0);
    return startY + cardH + 8;
  }

  private generatePDF(): jsPDF {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const marginX = 10;
    const usableWidth = 210 - marginX * 2;
    const halfWidth = usableWidth / 2;
    const pageHeight = 297;
    const chartHeight = 55;
    let currentY = 10;

    const ensureSpace = (needed: number) => {
      if (currentY + needed > pageHeight - 10) {
        pdf.addPage();
        currentY = 10;
      }
    };

    autoTable(pdf, {
      startY: 10,
      theme: 'grid',
      styles: { halign: 'center', valign: 'middle', fontSize: 10 },
      tableWidth: usableWidth,
      body: [
        [
          { content: 'DASHBOARD DE ADJUDICACIONES\nCOSTOS', styles: { fontSize: 14, fontStyle: 'bold' } },
          { content: 'Fecha: ' + new Date().toLocaleDateString() },
        ],
      ],
    });
    currentY = (pdf as any).lastAutoTable.finalY + 8;

    currentY = this.drawSummaryCards(pdf, currentY, marginX, usableWidth);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);

    // Adjudicaciones por estado (ancho completo)
    ensureSpace(chartHeight + 6);
    pdf.text('ADJUDICACIONES POR ESTADO', 105, currentY, { align: 'center' });
    const estadoImg = this.chartImage('chart-estado');
    if (estadoImg) pdf.addImage(estadoImg, 'PNG', marginX, currentY + 2, usableWidth, chartHeight);
    currentY += chartHeight + 10;

    // Pendientes por trabajador de OT (pasos 2 y 4)
    const pendientesPair = [
      { id: 'chart-pendientes-ot-2', title: 'PENDIENTES DE OT — PASO 2 (DATOS DEL CONTRATO)' },
      { id: 'chart-pendientes-ot-4', title: 'PENDIENTES DE OT — PASO 4 (POR ENVIAR AL SC)' },
    ];
    ensureSpace(chartHeight + 6);
    pendientesPair.forEach((c, j) => {
      pdf.text(c.title, marginX + halfWidth * j + halfWidth / 2, currentY, { align: 'center' });
    });
    pendientesPair.forEach((c, j) => {
      const img = this.chartImage(c.id);
      if (img) pdf.addImage(img, 'PNG', marginX + halfWidth * j, currentY + 2, halfWidth, chartHeight);
    });
    currentY += chartHeight + 10;

    // Rankings (barras horizontales) en filas de 2
    const rankPair = [
      { id: 'chart-top-pen', title: 'TOP SUBCONTRATISTAS POR MONTO (S/.)' },
      { id: 'chart-top-usd', title: 'TOP SUBCONTRATISTAS POR MONTO ($)' },
    ];
    ensureSpace(chartHeight + 6);
    rankPair.forEach((c, j) => {
      pdf.text(c.title, marginX + halfWidth * j + halfWidth / 2, currentY, { align: 'center' });
    });
    rankPair.forEach((c, j) => {
      const img = this.chartImage(c.id);
      if (img) pdf.addImage(img, 'PNG', marginX + halfWidth * j, currentY + 2, halfWidth, chartHeight);
    });
    currentY += chartHeight + 10;

    // Rankings solo de contratos con adelanto (total vs adelanto)
    const rankAdelantoPair = [
      { id: 'chart-top-adelanto-pen', title: 'TOP SUBCONTRATISTAS CON ADELANTO (S/.)' },
      { id: 'chart-top-adelanto-usd', title: 'TOP SUBCONTRATISTAS CON ADELANTO ($)' },
    ];
    ensureSpace(chartHeight + 6);
    rankAdelantoPair.forEach((c, j) => {
      pdf.text(c.title, marginX + halfWidth * j + halfWidth / 2, currentY, { align: 'center' });
    });
    rankAdelantoPair.forEach((c, j) => {
      const img = this.chartImage(c.id);
      if (img) pdf.addImage(img, 'PNG', marginX + halfWidth * j, currentY + 2, halfWidth, chartHeight);
    });
    currentY += chartHeight + 10;

    return pdf;
  }

  downloadPDF(): void {
    this.generatePDF().save('Dashboard-Adjudicaciones.pdf');
  }
}
