import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { ArquitecturaComercialService } from '../../../core/services/arquitectura-comercial.service';
import {
  GanttActividadDTO,
  ProyectoConActividadesDTO,
  SupervisorAcDTO,
} from '../../../core/dtos/arquitectura-comercial/actividades.model';

import { AC_TABS } from '../shared/arquitectura-comercial-tabs';
type TipoFiltro = '' | 'HITO' | 'ENTREGABLE' | 'CONSULTA';
type ZoomLevel  = 'day' | 'week' | 'month' | 'quarter';
type Status     = 'CULMINADO' | 'EN_PROCESO' | 'VENCIDO' | 'EN_RIESGO' | 'PENDIENTE';

const PX: Record<ZoomLevel, number> = { day: 28, week: 10, month: 6, quarter: 2 };

const STATUS_COLOR: Record<Status, string> = {
  CULMINADO:  '#9CA3AF',
  EN_PROCESO: '#3B82F6',
  VENCIDO:    '#EF4444',
  EN_RIESGO:  '#F59E0B',
  PENDIENTE:  '#93C5FD',
};

const STATUS_LABEL: Record<Status, string> = {
  CULMINADO:  '✓ Culminado',
  EN_PROCESO: '▶ En proceso',
  VENCIDO:    '⚠ Vencido',
  EN_RIESGO:  '● En riesgo',
  PENDIENTE:  '○ Pendiente',
};

const STATUS_TEXT: Record<Status, string> = {
  CULMINADO:  '#fff',
  EN_PROCESO: '#fff',
  VENCIDO:    '#fff',
  EN_RIESGO:  '#fff',
  PENDIENTE:  '#1E3A8A',
};

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_S = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS_S   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const PROJECT_PALETTE = [
  '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED',
  '#DB2777', '#0891B2', '#65A30D', '#9333EA', '#EA580C',
];

export interface GanttRow {
  id: number;
  nombre: string;
  tipo: string | null;
  etapa: string | null;
  proyecto: string | null;
  status: Status;
  startPlan: Date;
  endPlan: Date;
  planLeft:  number;
  planWidth: number;
  planColor: string;
  planText:  string;
  realLeft:  number | null;
  realWidth: number | null;
  realColor: string | null;
  startReal: Date | null;
  endReal:   Date | null;
}

export interface TimeCell { label: string; width: number; minor?: boolean; isCurrent: boolean; }

@Component({
  selector: 'app-arq-comercial-gantt',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './gantt.html',
  styleUrl: './gantt.css',
})
export class Gantt implements OnInit {
  readonly tabs = AC_TABS;
  // Fuerza el host como flex column con altura finita — evita que main sea el scroll container
  @HostBinding('style.display')       readonly _d  = 'flex';
  @HostBinding('style.flexDirection') readonly _fd = 'column';
  @HostBinding('style.flex')          readonly _f  = '1';
  @HostBinding('style.minHeight')     readonly _mh = '0';

  @ViewChild('ganttContent') ganttContentRef?: ElementRef<HTMLDivElement>;
  exportandoPdf = false;

  anioActual = new Date().getFullYear();
  readonly etapasFijas = ['PREVENTA','OBRA','EDIFICIO ENTREGADO','POST VENTA Y EXPERIENCIA','ALMACEN'];
  get etapaOptions(): Array<{ value: string; label: string }> {
    return this.etapasFijas.map(e => ({ value: e, label: e }));
  }

  proyectos: ProyectoConActividadesDTO[] = [];
  supervisores: SupervisorAcDTO[] = [];
  get proyectosConActividades() { return this.proyectos.filter(p => !p.sinActividades); }

  selectedProyectoIds: number[] = [];
  filtroSupervisorId: number | null = null;
  proyectoPanelOpen = false;
  proyectoSearch = '';

  get proyectosFiltrados(): ProyectoConActividadesDTO[] {
    const q = this.proyectoSearch.trim().toLowerCase();
    return q ? this.proyectosConActividades.filter(p => p.nombre.toLowerCase().includes(q)) : this.proyectosConActividades;
  }

  get selectedProyectosLabel(): string {
    if (this.selectedProyectoIds.length === 0) return 'Todos los proyectos';
    if (this.selectedProyectoIds.length === 1) {
      return this.proyectos.find(p => p.id === this.selectedProyectoIds[0])?.nombre ?? '1 proyecto';
    }
    return `${this.selectedProyectoIds.length} proyectos seleccionados`;
  }

  tipoFiltro: TipoFiltro = '';
  etapaNombreFiltro: string | null = null;
  excluirCulminadas = true;
  zoomLevel: ZoomLevel = 'month';

  loading = false;

  // Gantt state
  ganttRows: GanttRow[] = [];
  majorCells: TimeCell[] = [];
  minorCells: TimeCell[] = [];
  timelineStart!: Date;
  timelineWidth = 0;
  todayLeft = 0;
  pxPerDay = PX.month;
  readonly leftWidth = 780;

  readonly legend = [
    { label: 'Pendiente',        color: STATUS_COLOR.PENDIENTE  },
    { label: 'En proceso',       color: STATUS_COLOR.EN_PROCESO },
    { label: 'En riesgo',        color: STATUS_COLOR.EN_RIESGO  },
    { label: 'Vencido',          color: STATUS_COLOR.VENCIDO    },
    { label: 'Culminado',        color: STATUS_COLOR.CULMINADO  },
    { label: 'Real (a tiempo)',  color: '#10B981' },
    { label: 'Real (con retraso)', color: '#F97316' },
  ];

  constructor(private service: ArquitecturaComercialService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadProyectos(); this.loadSupervisores(); }

  loadProyectos(): void {
    this.service.getProyectosConActividades().subscribe({
      next: data => {
        this.proyectos = [...data].sort((a, b) =>
          a.totalActividades > 0 && b.totalActividades === 0 ? -1 :
          a.totalActividades === 0 && b.totalActividades > 0 ? 1 :
          a.nombre.localeCompare(b.nombre));
        if (this.proyectosConActividades.length > 0) {
          this.selectedProyectoIds = [this.proyectosConActividades[0].id];
          this.loadGantt();
        }
        this.cdr.detectChanges();
      },
    });
  }

  loadSupervisores(): void {
    this.service.getSupervisoresAc().subscribe({
      next: data => { this.supervisores = data; this.cdr.detectChanges(); },
    });
  }

  toggleProyecto(id: number): void {
    this.selectedProyectoIds = this.selectedProyectoIds.includes(id)
      ? this.selectedProyectoIds.filter(x => x !== id)
      : [...this.selectedProyectoIds, id];
  }
  seleccionarTodosProyectos(): void { this.selectedProyectoIds = this.proyectosConActividades.map(p => p.id); }
  limpiarProyectos(): void { this.selectedProyectoIds = []; }
  aplicarProyectos(): void {
    this.proyectoPanelOpen = false;
    this.filtroSupervisorId = null; this.tipoFiltro = ''; this.etapaNombreFiltro = null;
    this.loadGantt();
  }
  onSupervisorChange(id: number | null): void { this.filtroSupervisorId = id; this.selectedProyectoIds = []; this.tipoFiltro = ''; this.etapaNombreFiltro = null; this.loadGantt(); }
  setTipo(t: TipoFiltro): void { this.tipoFiltro = t; this.loadGantt(); }
  onFiltroChange(): void { this.loadGantt(); }

  setZoom(z: ZoomLevel): void {
    this.zoomLevel = z;
    this.pxPerDay  = PX[z];
    this.rebuildTimeline(this._rawData);
    this.cdr.detectChanges();
  }

  private _rawData: GanttActividadDTO[] = [];

  loadGantt(): void {
    if (this.selectedProyectoIds.length === 0 && !this.filtroSupervisorId) return;
    this.loading = true;
    this.cdr.detectChanges();

    if (this.filtroSupervisorId) {
      // Carga todas las actividades del supervisor (todos los proyectos) y las convierte al formato Gantt
      this.service.getActividades({
        filtroUserId: this.filtroSupervisorId,
        tipo: this.tipoFiltro || null,
        soloActivas: this.excluirCulminadas ? true : null,
        porPagina: 500,
      }).subscribe({
        next: res => {
          const ganttItems: GanttActividadDTO[] = (res.items ?? []).map(a => ({
            id: a.id,
            projectId: a.projectId,
            projectNombre: a.projectNombre,
            orden: a.orden,
            nombre: a.nombre,
            tipo: a.partidaDeControl,
            etapaId: a.etapaId,
            etapaNombre: a.etapaNombre,
            activo: a.activo,
            inicioProgramado: a.inicioProgramado,
            finProgramado: a.finProgramado,
            inicioEfectivo: a.inicioEfectivo,
            finEfectivo: a.finEfectivo,
          }));
          this._rawData = ganttItems;
          this.loading  = false;
          this.rebuildTimeline(ganttItems);
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); },
      });
    } else {
      // Un pedido por proyecto seleccionado, mergeados en un solo Gantt (cada fila conserva su
      // projectNombre para diferenciarlos visualmente cuando hay más de uno seleccionado).
      const requests = this.selectedProyectoIds.map(id =>
        this.service.getGantt({ proyectoId: id, tipo: this.tipoFiltro || null,
                                etapa: this.etapaNombreFiltro, soloActivas: null }));
      forkJoin(requests).subscribe({
        next: results => {
          this._rawData = results.flat();
          this.loading  = false;
          this.rebuildTimeline(this._rawData);
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); },
      });
    }
  }

  private rebuildTimeline(data: GanttActividadDTO[]): void {
    const today  = new Date(); today.setHours(0,0,0,0);
    const px     = PX[this.zoomLevel];
    this.pxPerDay = px;

    // Filter
    const rows = this.excluirCulminadas ? data.filter(a => !a.finEfectivo) : data;
    const withDates = rows.filter(a => a.inicioProgramado);

    if (withDates.length === 0) { this.ganttRows = []; this.cdr.detectChanges(); return; }

    // Date range
    const allDates: Date[] = [];
    withDates.forEach(a => {
      if (a.inicioProgramado) allDates.push(this.pd(a.inicioProgramado));
      if (a.finProgramado)    allDates.push(this.pd(a.finProgramado));
      if (a.inicioEfectivo)   allDates.push(this.pd(a.inicioEfectivo));
      if (a.finEfectivo)      allDates.push(this.pd(a.finEfectivo));
    });
    allDates.push(today);

    const minD = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxD = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Add buffer: start of prev month, end of next+1 month
    const tStart = new Date(minD.getFullYear(), minD.getMonth() - 1, 1);
    const tEnd   = new Date(maxD.getFullYear(), maxD.getMonth() + 2, 1);
    this.timelineStart = tStart;

    const totalDays = Math.ceil((tEnd.getTime() - tStart.getTime()) / 86400000);
    this.timelineWidth = totalDays * px;

    // Today marker
    this.todayLeft = Math.round(this.dayOffset(today) * px);

    // Header cells
    this.buildHeader(tStart, tEnd, px);

    // Build rows
    this.ganttRows = withDates.map(a => {
      const startPlan = this.pd(a.inicioProgramado!);
      const endPlan   = a.finProgramado ? this.pd(a.finProgramado) : this.addDays(startPlan, 1);
      const status    = this.computeStatus(a, today);
      const planColor = STATUS_COLOR[status];

      let realLeft:  number | null = null;
      let realWidth: number | null = null;
      let realColor: string | null = null;
      let startReal: Date | null   = null;
      let endReal:   Date | null   = null;

      if (a.inicioEfectivo) {
        startReal = this.pd(a.inicioEfectivo);
        // Si está EN PROCESO (sin fin efectivo), la barra real llega hasta hoy
        endReal = a.finEfectivo
          ? this.pd(a.finEfectivo)
          : status === 'EN_PROCESO' ? today : this.addDays(startReal, 1);
        const late = a.finEfectivo && a.finProgramado &&
                     this.pd(a.finEfectivo) > this.pd(a.finProgramado);
        realLeft  = Math.round(this.dayOffset(startReal) * px);
        realWidth = Math.max(6, Math.round((endReal.getTime() - startReal.getTime()) / 86400000) * px);
        realColor = late ? '#F97316' : '#10B981';
      }

      return {
        id:        a.id,
        nombre:    a.nombre,
        tipo:      a.tipo,
        etapa:     a.etapaNombre,
        proyecto:  a.projectNombre ?? null,
        status,
        startPlan,
        endPlan,
        planLeft:  Math.round(this.dayOffset(startPlan) * px),
        planWidth: Math.max(8, Math.round((endPlan.getTime() - startPlan.getTime()) / 86400000) * px),
        planColor,
        planText:  STATUS_TEXT[status],
        realLeft,
        realWidth,
        realColor,
        startReal,
        endReal,
      };
    });
  }

  private buildHeader(start: Date, end: Date, px: number): void {
    this.majorCells = [];
    this.minorCells = [];
    const today = new Date(); today.setHours(0,0,0,0);

    if (this.zoomLevel === 'month') {
      // Major: year, Minor: month
      let yr = start.getFullYear();
      while (yr <= end.getFullYear()) {
        const yStart = new Date(yr, 0, 1) < start ? start : new Date(yr, 0, 1);
        const yEnd   = new Date(yr + 1, 0, 1) > end ? end : new Date(yr + 1, 0, 1);
        const days   = (yEnd.getTime() - yStart.getTime()) / 86400000;
        this.majorCells.push({ label: String(yr), width: Math.round(days * px), isCurrent: yr === today.getFullYear() });
        yr++;
      }
      let d = new Date(start.getFullYear(), start.getMonth(), 1);
      while (d < end) {
        const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const isCurrent = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        this.minorCells.push({ label: MONTHS[d.getMonth()], width: Math.round(dim * px), isCurrent });
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }

    } else if (this.zoomLevel === 'week') {
      // Major: month, Minor: week
      let d = new Date(start.getFullYear(), start.getMonth(), 1);
      while (d < end) {
        const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        this.majorCells.push({ label: `${MONTHS_S[d.getMonth()]} ${d.getFullYear()}`, width: Math.round(dim * px), isCurrent: false });
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
      let wd = new Date(start);
      // align to Monday
      const dow = wd.getDay(); wd.setDate(wd.getDate() - (dow === 0 ? 6 : dow - 1));
      while (wd < end) {
        const wEnd = this.addDays(wd, 7);
        const w = Math.ceil((wd.getTime() - new Date(wd.getFullYear(), 0, 1).getTime()) / 604800000);
        const isCurrent = today >= wd && today < wEnd;
        this.minorCells.push({ label: `S${w}`, width: 7 * px, isCurrent });
        wd = wEnd;
      }

    } else if (this.zoomLevel === 'quarter') {
      // Major: year, Minor: quarter
      let yr = start.getFullYear();
      while (yr <= end.getFullYear()) {
        const yDays = (new Date(yr + 1, 0, 1).getTime() - new Date(yr, 0, 1).getTime()) / 86400000;
        this.majorCells.push({ label: String(yr), width: Math.round(yDays * px), isCurrent: yr === today.getFullYear() });
        yr++;
      }
      for (let q = 0; q < 4; q++) {
        [start.getFullYear(), start.getFullYear() + 1].forEach(y => {
          const qStart = new Date(y, q * 3, 1);
          const qEnd   = new Date(y, q * 3 + 3, 1);
          if (qStart >= end || qEnd <= start) return;
          const days = (qEnd.getTime() - qStart.getTime()) / 86400000;
          const isCurrent = today >= qStart && today < qEnd;
          this.minorCells.push({ label: `Q${q + 1} ${y}`, width: Math.round(days * px), isCurrent });
        });
      }

    } else { // day
      // Major: month, Minor: day
      let d = new Date(start.getFullYear(), start.getMonth(), 1);
      while (d < end) {
        const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        this.majorCells.push({ label: `${MONTHS_S[d.getMonth()]} ${d.getFullYear()}`, width: dim * px, isCurrent: false });
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
      let dd = new Date(start);
      while (dd < end) {
        const isCurrent = dd.getTime() === today.getTime();
        const isWeekend = dd.getDay() === 0 || dd.getDay() === 6;
        this.minorCells.push({ label: `${dd.getDate()}`, width: px, isCurrent, minor: isWeekend });
        dd = this.addDays(dd, 1);
      }
    }
  }

  private dayOffset(d: Date): number {
    return (d.getTime() - this.timelineStart.getTime()) / 86400000;
  }

  private computeStatus(a: GanttActividadDTO, today: Date): Status {
    if (a.finEfectivo)    return 'CULMINADO';
    if (a.inicioEfectivo) return 'EN_PROCESO';
    if (a.finProgramado && this.pd(a.finProgramado) < today)  return 'VENCIDO';
    if (a.inicioProgramado && this.pd(a.inicioProgramado) <= today) return 'EN_RIESGO';
    return 'PENDIENTE';
  }

  statusLabel(s: Status): string { return STATUS_LABEL[s]; }
  statusColor(s: Status): string { return STATUS_COLOR[s]; }

  etapaClass(e: string | null): string {
    const map: Record<string, string> = {
      'PREVENTA':                'badge-preventa',
      'OBRA':                    'badge-obra',
      'EDIFICIO ENTREGADO':      'badge-edificio',
      'POST VENTA Y EXPERIENCIA':'badge-postventa',
      'ALMACEN':                 'badge-almacen',
    };
    return 'badge ' + (e ? (map[e] ?? 'badge-default') : 'badge-default');
  }

  tipoClass(t: string | null): string {
    const map: Record<string, string> = {
      'ENTREGABLE': 'badge-entregable',
      'HITO':       'badge-hito',
      'CONSULTA':   'badge-consulta',
    };
    return 'badge ' + (t ? (map[t] ?? 'badge-default') : 'badge-default');
  }

  private pd(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private addDays(d: Date, n: number): Date {
    const r = new Date(d); r.setDate(r.getDate() + n); return r;
  }

  fmtDate(d: Date | null): string {
    if (!d) return '—';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  truncate(s: string, n = 32): string { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  trackByRow(_: number, r: GanttRow): number { return r.id; }
  trackByProyecto(_: number, p: ProyectoConActividadesDTO): number { return p.id; }

  isProyectoSelected(id: number): boolean { return this.selectedProyectoIds.includes(id); }

  /** Nombres de proyecto distintos presentes en las filas actuales, en orden de aparición. */
  get proyectosDistintos(): string[] {
    const vistos = new Set<string>();
    const out: string[] = [];
    for (const r of this.ganttRows) {
      if (r.proyecto && !vistos.has(r.proyecto)) { vistos.add(r.proyecto); out.push(r.proyecto); }
    }
    return out;
  }

  /** Solo diferenciamos por color cuando hay más de un proyecto en pantalla. */
  get mostrarColorProyecto(): boolean { return this.proyectosDistintos.length > 1; }

  proyectoColor(nombre: string | null): string {
    if (!nombre) return 'transparent';
    const idx = this.proyectosDistintos.indexOf(nombre);
    return idx === -1 ? 'transparent' : PROJECT_PALETTE[idx % PROJECT_PALETTE.length];
  }

  async exportarPdf(): Promise<void> {
    const el = this.ganttContentRef?.nativeElement;
    if (!el || this.exportandoPdf) return;
    this.exportandoPdf = true;
    this.cdr.detectChanges();

    const tituloProyectos = this.selectedProyectosLabel;
    const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
    const proyectosLeyenda = this.proyectosDistintos;
    const proyectoColorFn = (nombre: string) => this.proyectoColor(nombre);

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (doc, cloned) => {
          // El header y la columna izquierda usan position:sticky para quedar fijos mientras
          // se hace scroll en pantalla. Al capturar el elemento completo (no solo el viewport),
          // html2canvas los renderiza en el offset "pegado" que tenían en el momento del scroll
          // real, desalineándolos de las barras del timeline. Para el export los volvemos
          // estáticos, así cada fila queda en su posición natural del documento.
          doc.querySelectorAll('.gp-head, .gp-left, .gp-left-head, .gp-left-data').forEach((node) => {
            const h = node as HTMLElement;
            h.style.position = 'static';
            h.style.top = 'auto';
            h.style.left = 'auto';
          });

          const header = doc.createElement('div');
          header.style.cssText =
            'padding:14px 20px;background:#fff;border-bottom:2px solid #1a4731;' +
            'display:flex;flex-direction:column;gap:8px;font-family:Arial,Helvetica,sans-serif';

          const titleRow = doc.createElement('div');
          titleRow.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:16px';
          titleRow.innerHTML =
            '<span style="font-size:20px;font-weight:700;color:#1a4731">Cronograma Gantt — Arquitectura Comercial</span>' +
            `<span style="font-size:12px;color:#6B7280">${tituloProyectos} · Generado el ${fecha}</span>`;
          header.appendChild(titleRow);

          if (proyectosLeyenda.length > 1) {
            const legendRow = doc.createElement('div');
            legendRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px 18px';
            legendRow.innerHTML = proyectosLeyenda
              .map(
                (nombre) =>
                  '<span style="display:flex;align-items:center;gap:5px;font-size:11px;color:#374151;font-weight:600">' +
                  `<span style="width:12px;height:12px;border-radius:3px;background:${proyectoColorFn(nombre)};display:inline-block"></span>${nombre}` +
                  '</span>',
              )
              .join('');
            header.appendChild(legendRow);
          }

          cloned.insertBefore(header, cloned.firstChild);
        },
      });

      const img = canvas.toDataURL('image/png');
      // A2 horizontal: todo el timeline en una sola hoja, escalado a lo ancho.
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a2' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      let imgW = pageW - 20;
      let imgH = imgW * ratio;
      if (imgH > pageH - 20) {
        imgH = pageH - 20;
        imgW = imgH / ratio;
      }
      const x = (pageW - imgW) / 2;
      pdf.addImage(img, 'PNG', x, 10, imgW, imgH);
      pdf.save(`gantt-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      this.exportandoPdf = false;
      this.cdr.detectChanges();
    }
  }
}
