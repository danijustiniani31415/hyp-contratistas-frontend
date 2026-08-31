import {
  Component, inject, OnInit, signal, AfterViewInit, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IndicadoresProactivosService } from '../../indicadores-proactivos.service';
import { HorasHombreService } from '../../../horas-hombre/services/horas-hombre.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { IndicadorProactivoProyectoDto, IndicadorReactivoProyectoDto, PuntajeMesDto } from '../../indicadores-proactivos.dtos';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { SelectOption } from '../../../../../../shared/services/shared-filters.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

Chart.register(...registerables, ChartDataLabels);

interface DesempenoSupervisorDto {
  pctGeneral: number;
  proyectoId: number;
}

interface MesSerieDto {
  mes: number;
  anio: number;
  totalAccidentes: number;
  totalDiasPerdidos: number;
  trabajadores: number;
}

@Component({
  selector: 'app-dashboard-proyecto',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './dashboard-proyecto.component.html',
  styleUrls: ['./dashboard-proyecto.component.css'],
})
export class DashboardProyectoComponent implements OnInit, AfterViewInit {
  private svc         = inject(IndicadoresProactivosService);
  private horasHombreSvc = inject(HorasHombreService);
  private loader      = inject(LoaderService);
  private errorSvc    = inject(ErrorService);
  private http        = inject(HttpClient);

  @ViewChild('reportContent') reportContentRef!: ElementRef<HTMLDivElement>;
  @ViewChild('accCanvas') accCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('diasCanvas') diasCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('trabCanvas') trabCanvasRef?: ElementRef<HTMLCanvasElement>;

  private accChart: Chart | null = null;
  private diasChart: Chart | null = null;
  private trabChart: Chart | null = null;

  private baseSupervisor = `${environment.apiUrl}api/v1/ssoma-desempeno-supervisor`;

  proyectos = signal<SelectOption[]>([]);
  proyectoId = signal<number | null>(null);
  mes = signal<number>(new Date().getMonth() + 1);
  anio = signal<number>(new Date().getFullYear());

  indicadores = signal<IndicadorProactivoProyectoDto | null>(null);
  puntaje     = signal<PuntajeMesDto | null>(null);
  exportando  = signal(false);

  reactivoActual   = signal<IndicadorReactivoProyectoDto | null>(null);
  reactivoAcumulado = signal<{ accidentes: number; diasPerdidos: number; hht: number } | null>(null);
  serieMensual     = signal<MesSerieDto[]>([]);
  pctSupervisor    = signal<number>(0);

  meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];
  anios = [2024, 2025, 2026, 2027].map(a => ({ valor: a, nombre: String(a) }));

  ngOnInit(): void {
    this.http.get<SelectOption[]>(`${environment.apiUrl}api/v1/shared-filters/proyectos`)
      .subscribe({ next: data => this.proyectos.set(data) });
  }

  ngAfterViewInit(): void {}

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  private getReactivosMes(mes: number, anio: number) {
    return this.svc.getReactivosTodos(mes, anio).pipe(catchError(() => of([] as IndicadorReactivoProyectoDto[])));
  }

  private getHorasHombreMes(proyectoId: number, mes: number, anio: number) {
    return this.horasHombreSvc.getDashboard(proyectoId, mes, anio).pipe(catchError(() => of(null)));
  }

  private getSupervisorProyecto(proyectoId: number, mes: number, anio: number) {
    const params = new HttpParams().set('mes', mes).set('anio', anio).set('proyectoId', proyectoId);
    return this.http.get<DesempenoSupervisorDto[]>(this.baseSupervisor, { headers: this.authHeaders(), params })
      .pipe(catchError(() => of([] as DesempenoSupervisorDto[])));
  }

  cargar(): void {
    if (!this.proyectoId()) return;
    const pid = this.proyectoId()!;
    const mesSel = this.mes();
    const anioSel = this.anio();

    this.loader.show();
    this.indicadores.set(null);
    this.puntaje.set(null);

    forkJoin({
      ind: this.svc.getIndicadoresProyecto(pid, mesSel, anioSel),
      pts: this.svc.getPuntaje(pid, mesSel, anioSel),
      supervisor: this.getSupervisorProyecto(pid, mesSel, anioSel),
    }).subscribe({
      next: ({ ind, pts, supervisor }) => {
        this.indicadores.set(ind);
        this.puntaje.set(pts);
        this.pctSupervisor.set(
          supervisor.length ? supervisor.reduce((a, s) => a + s.pctGeneral, 0) / supervisor.length : 0
        );
        this.loader.hide();
        this.cargarSerieMensual(pid, mesSel, anioSel);
      },
      error: err => { this.loader.hide(); this.errorSvc.handleError(err); },
    });
  }

  private cargarSerieMensual(proyectoId: number, mesHasta: number, anio: number): void {
    const mesesRango = Array.from({ length: mesHasta }, (_, i) => i + 1);
    forkJoin(
      mesesRango.map(m => forkJoin({
        reactivos: this.getReactivosMes(m, anio),
        horasHombre: this.getHorasHombreMes(proyectoId, m, anio),
      }))
    ).subscribe(resultados => {
      const serie: MesSerieDto[] = resultados.map((r, idx) => {
        const m = mesesRango[idx];
        const reactivoProyecto = r.reactivos.find(x => x.proyectoId === proyectoId);
        return {
          mes: m,
          anio,
          totalAccidentes: reactivoProyecto?.totalAccidentes ?? 0,
          totalDiasPerdidos: reactivoProyecto?.totalDiasPerdidos ?? 0,
          trabajadores: Math.round(r.horasHombre?.promedioPersonasPorDia ?? 0),
        };
      });
      this.serieMensual.set(serie);

      const acumAccidentes = serie.reduce((acc, s) => acc + s.totalAccidentes, 0);
      const acumDias = serie.reduce((acc, s) => acc + s.totalDiasPerdidos, 0);
      const hhtAcum = resultados.reduce((acc, r) => acc + (r.horasHombre?.totalHorasHombre ?? 0), 0);

      this.reactivoAcumulado.set({ accidentes: acumAccidentes, diasPerdidos: acumDias, hht: hhtAcum });

      const ultimoResultado = resultados[resultados.length - 1];
      this.reactivoActual.set(ultimoResultado.reactivos.find(x => x.proyectoId === proyectoId) ?? null);

      setTimeout(() => this.renderMiniCharts(serie), 50);
    });
  }

  // ── Semáforo reactivos (mayor = peor) — mismos umbrales que el resto de SSOMA
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
  accColorClass(val: number): string {
    return val > 0 ? 'rx--alert' : 'rx--cero';
  }

  trabajadoresMes(): number {
    const serie = this.serieMensual();
    return serie.length ? serie[serie.length - 1].trabajadores : 0;
  }

  private lineDataset(label: string, data: number[], color: string): any {
    return {
      label,
      data,
      borderColor: color,
      backgroundColor: color + '26',
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointBorderWidth: 1.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
      tension: 0.35,
      fill: true,
    };
  }

  private readonly MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  private renderMiniCharts(serie: MesSerieDto[]): void {
    const labels = serie.map(s => this.MESES_CORTOS[s.mes - 1]);

    if (this.accCanvasRef?.nativeElement) {
      if (this.accChart) this.accChart.destroy();
      this.accChart = new Chart(this.accCanvasRef.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [this.lineDataset('N° de Accidentes', serie.map(s => s.totalAccidentes), '#dc2626')],
        },
        options: this.miniChartOptions('#dc2626'),
      });
    }

    if (this.diasCanvasRef?.nativeElement) {
      if (this.diasChart) this.diasChart.destroy();
      this.diasChart = new Chart(this.diasCanvasRef.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [this.lineDataset('N° de Días Perdidos', serie.map(s => s.totalDiasPerdidos), '#ea580c')],
        },
        options: this.miniChartOptions('#ea580c'),
      });
    }

    if (this.trabCanvasRef?.nativeElement) {
      if (this.trabChart) this.trabChart.destroy();
      this.trabChart = new Chart(this.trabCanvasRef.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [this.lineDataset('N° de Trabajadores (promedio)', serie.map(s => s.trabajadores), '#0f4c75')],
        },
        options: this.miniChartOptions('#0f4c75'),
      });
    }
  }

  private miniChartOptions(color: string): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      // Padding generoso arriba: antes el valor del pico chocaba con la leyenda.
      layout: { padding: { top: 26, right: 10, left: 4 } },
      plugins: {
        // Sin leyenda: el título de la card ya dice qué mide, mostrarla dos
        // veces (título + leyenda) era ruido y tapaba los números del pico.
        legend: { display: false },
        datalabels: {
          align: 'top',
          anchor: 'end',
          offset: 4,
          color,
          font: { size: 10.5, weight: 'bold' },
          formatter: (v: number) => Math.round(v),
        },
      },
      elements: { point: { radius: 3, hoverRadius: 5 } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { size: 9 }, precision: 0, color: '#94a3b8' },
          grid: { color: '#f1f5f9' },
          border: { display: false },
          // Deja aire arriba para que el datalabel del punto más alto no se corte.
          afterDataLimits: (axis: any) => { axis.max = axis.max * 1.28 || 1; },
        },
        x: { ticks: { font: { size: 9.5, weight: 'bold' }, color: '#64748b' }, grid: { display: false }, border: { color: '#e2e8f0' } },
      },
    };
  }

  async exportarPDF(): Promise<void> {
    const el = this.reportContentRef?.nativeElement;
    if (!el) return;
    this.exportando.set(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#f4f6f9' });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgW  = pageW - 20;
      const imgH  = imgW * ratio;

      if (imgH <= pageH - 20) {
        pdf.addImage(img, 'PNG', 10, 10, imgW, imgH);
      } else {
        let yPos = 0;
        while (yPos < canvas.height) {
          const sliceH = Math.min((pageH - 20) / (imgW / canvas.width), canvas.height - yPos);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          sliceCanvas.getContext('2d')!.drawImage(canvas, 0, -yPos);
          if (yPos > 0) pdf.addPage();
          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 10, 10, imgW, sliceH * (imgW / canvas.width));
          yPos += sliceH;
        }
      }

      const ind = this.indicadores();
      pdf.save(`SSOMA-${ind?.proyectoNombre ?? 'proyecto'}-${this.nombreMes(this.mes())}-${this.anio()}.pdf`);
    } finally {
      this.exportando.set(false);
    }
  }

  nombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre ?? '';
  }

  gaugeOffset(score: number, max: number = 110): number {
    return 251.2 * (1 - Math.min(score / max, 1));
  }

  gaugeColor(score: number): string {
    if (score >= 90) return '#16a34a';
    if (score >= 70) return '#ca8a04';
    if (score >= 50) return '#ea580c';
    return '#dc2626';
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'completado': return 'estado-completado';
      case 'en_progreso': return 'estado-en-progreso';
      default: return 'estado-pendiente';
    }
  }

  estadoLabel(estado: string): string {
    switch (estado) {
      case 'completado': return 'Completado';
      case 'en_progreso': return 'En progreso';
      default: return 'Pendiente';
    }
  }

  porcentajeColor(pct: number): string {
    if (pct === 100) return '#16a34a';
    if (pct >= 50) return '#d97706';
    return '#1e3a5f';
  }
}
