import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import jsPDF from 'jspdf';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { DashboardVecinosService } from '../services/dashboard-vecinos.service';
import {
  VecinosDashboardDTO,
  DashboardProjectDTO,
  DashboardEstadoDTO,
} from '../dtos/dashboard-vecinos.dto';

import { VECINOS_TABS } from '../../shared/vecinos-tabs';
Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-dashboard-vecinos',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './dashboard-vecinos.html',
})
export class DashboardVecinos implements AfterViewInit {
  readonly tabs = VECINOS_TABS;
  data?: VecinosDashboardDTO;

  constructor(
    private service: DashboardVecinosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.load();
  }

  private load(): void {
    this.loaderService.show();
    this.service.getDashboard().subscribe({
      next: (res) => {
        this.data = res;
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

  // ── Helpers de presentación (usados también en la plantilla) ───────────────

  /** Rango de orden para mostrar: cumplido (verde) → intermedio (azul) → pendiente (rojo). */
  rank(descripcion: string): number {
    const d = descripcion.toLowerCase();
    if (/(acept|culmin|cerr|aprob|conform)/.test(d)) return 0;
    if (/(deneg|proceso|curso)/.test(d)) return 1;
    return 2; // por responder / pendiente / otros
  }

  /** Color semántico por estado, consistente con el resto de la app. */
  colorFor(descripcion: string): string {
    const d = descripcion.toLowerCase();
    if (/(acept|culmin|cerr|aprob|conform)/.test(d)) return '#64BC04'; // verde
    if (/(deneg|proceso|curso)/.test(d)) return '#15445C'; // azul oscuro
    return '#D30000'; // rojo (por responder / pendiente)
  }

  sorted(items: DashboardEstadoDTO[]): DashboardEstadoDTO[] {
    return [...items].sort((a, b) => this.rank(a.descripcion) - this.rank(b.descripcion));
  }

  total(items: DashboardEstadoDTO[]): number {
    return items.reduce((s, i) => s + i.count, 0);
  }

  pct(hechas: number, programadas: number): number {
    if (!programadas) return 0;
    return Math.round((hechas / programadas) * 100);
  }

  /** Un proyecto se muestra solo si tiene algún dato (vecinos, solicitudes, compromisos o limpiezas). */
  hasData(p: DashboardProjectDTO): boolean {
    return (
      p.lotesCount > 0 ||
      p.vecinosCount > 0 ||
      this.total(p.solicitudes) > 0 ||
      this.total(p.compromisos) > 0 ||
      (p.limpiezas?.totalProgramadas ?? 0) > 0
    );
  }

  get proyectosVisibles(): DashboardProjectDTO[] {
    return this.data?.proyectos.filter((p) => this.hasData(p)) ?? [];
  }

  // ── Render de donuts ───────────────────────────────────────────────────────

  private renderAll(): void {
    if (!this.data) return;
    this.renderBlock(this.data.resumen);
    this.proyectosVisibles.forEach((p) => this.renderBlock(p));
  }

  private renderBlock(block: DashboardProjectDTO): void {
    this.donut(`sol-${block.projectId}`, block.solicitudes);
    this.donut(`com-${block.projectId}`, block.compromisos);
  }

  // ── Exportar PDF ───────────────────────────────────────────────────────────

  downloadPDF(): void {
    if (!this.data) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const pageH = 297;
    const marginX = 10;
    const usableW = pageW - marginX * 2;

    pdf.setFontSize(15);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DASHBOARD DE VECINOS', pageW / 2, 14, { align: 'center' });
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120);
    pdf.text('Fecha: ' + new Date().toLocaleDateString('es-PE'), pageW / 2, 20, { align: 'center' });
    pdf.setTextColor(0);

    let y = 28;
    const blocks = [this.data.resumen, ...this.proyectosVisibles];
    blocks.forEach((b, idx) => {
      y = this.drawPdfBlock(pdf, b, marginX, y, usableW, pageH, idx === 0);
    });

    pdf.save('Dashboard-Vecinos.pdf');
  }

  private drawPdfBlock(
    pdf: jsPDF,
    block: DashboardProjectDTO,
    marginX: number,
    yStart: number,
    usableW: number,
    pageH: number,
    isResumen: boolean,
  ): number {
    let y = yStart;
    const estimate = 64;
    if (y + estimate > pageH - 12) {
      pdf.addPage();
      y = 14;
    }

    // Encabezado del bloque
    pdf.setFontSize(isResumen ? 12 : 10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text(isResumen ? 'RESUMEN GENERAL' : block.projectDescription, marginX, y);
    pdf.setTextColor(100, 188, 4);
    pdf.text(`${block.lotesCount} lotes · ${block.vecinosCount} vecinos`, marginX + usableW, y, { align: 'right' });
    pdf.setTextColor(0);
    y += 2.5;
    pdf.setDrawColor(226, 232, 240);
    pdf.line(marginX, y, marginX + usableW, y);
    y += 4;

    const colW = usableW / 2;
    const imgW = 40;
    const imgH = 36;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(120);
    pdf.text('SOLICITUDES', marginX + colW / 2, y, { align: 'center' });
    pdf.text('COMPROMISOS', marginX + colW + colW / 2, y, { align: 'center' });
    pdf.setTextColor(0);

    const imgY = y + 2;
    pdf.addImage(this.donutImageData(block.solicitudes), 'PNG', marginX + colW / 2 - imgW / 2, imgY, imgW, imgH);
    pdf.addImage(this.donutImageData(block.compromisos), 'PNG', marginX + colW + colW / 2 - imgW / 2, imgY, imgW, imgH);

    const legendY = imgY + imgH + 4;
    const ly1 = this.drawPdfLegend(pdf, this.sorted(block.solicitudes), marginX + 6, legendY, colW - 12);
    const ly2 = this.drawPdfLegend(pdf, this.sorted(block.compromisos), marginX + colW + 6, legendY, colW - 12);

    return Math.max(ly1, ly2) + 7;
  }

  private drawPdfLegend(
    pdf: jsPDF,
    items: DashboardEstadoDTO[],
    x: number,
    yStart: number,
    maxW: number,
  ): number {
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    let cx = x;
    let y = yStart;
    const lineH = 4;
    for (const it of items) {
      const label = `${it.descripcion} · ${it.count}`;
      const w = pdf.getTextWidth(label) + 6;
      if (cx + w > x + maxW) {
        cx = x;
        y += lineH;
      }
      const [r, g, b] = this.hexToRgb(this.colorFor(it.descripcion));
      pdf.setFillColor(r, g, b);
      pdf.circle(cx + 1.2, y - 1, 1.1, 'F');
      pdf.setTextColor(80);
      pdf.text(label, cx + 4, y);
      cx += w;
    }
    pdf.setTextColor(0);
    return y;
  }

  /** Genera la imagen de un donut en un canvas offscreen cuadrado para el PDF. */
  private donutImageData(items: DashboardEstadoDTO[]): string {
    const sorted = this.sorted(items);
    const total = this.total(sorted);
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 300;

    const centerText = {
      id: 'pdfCenter',
      afterDraw(chart: any) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const cx = (chartArea.left + chartArea.right) / 2;
        const cy = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText(String(total), cx, cy - 4);
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '600 14px sans-serif';
        ctx.fillText('TOTAL', cx, cy + 24);
        ctx.restore();
      },
    };

    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: total ? sorted.map((i) => i.descripcion) : ['Sin datos'],
        datasets: [
          {
            data: total ? sorted.map((i) => i.count) : [1],
            backgroundColor: total ? sorted.map((i) => this.colorFor(i.descripcion)) : ['#EEF1F4'],
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        animation: false,
        responsive: false,
        cutout: '58%',
        layout: { padding: 8 },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          datalabels: {
            display: total > 0,
            color: '#ffffff',
            font: { weight: 'bold', size: 18 },
            formatter: (v: number) => (v > 0 ? v : ''),
          },
        },
      },
      plugins: [centerText],
    });

    const url = chart.toBase64Image();
    chart.destroy();
    return url;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }

  private donut(canvasId: string, items: DashboardEstadoDTO[]): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;

    const sorted = this.sorted(items);
    const total = this.total(sorted);
    const labels = sorted.map((i) => i.descripcion);
    const values = sorted.map((i) => i.count);
    const colors = sorted.map((i) => this.colorFor(i.descripcion));

    // Texto central con el total.
    const centerText = {
      id: `center-${canvasId}`,
      afterDraw(chart: any) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const cx = (chartArea.left + chartArea.right) / 2;
        const cy = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(String(total), cx, cy - 2);
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '600 9px sans-serif';
        ctx.fillText('TOTAL', cx, cy + 14);
        ctx.restore();
      },
    };

    Chart.getChart(canvas)?.destroy();
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: total ? labels : ['Sin datos'],
        datasets: [
          {
            data: total ? values : [1],
            backgroundColor: total ? colors : ['#EEF1F4'],
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: total > 0 },
          datalabels: {
            display: total > 0,
            color: '#ffffff',
            font: { weight: 'bold', size: 11 },
            formatter: (v: number) => (v > 0 ? v : ''),
          },
        },
      },
      plugins: [centerText],
    });
  }
}
