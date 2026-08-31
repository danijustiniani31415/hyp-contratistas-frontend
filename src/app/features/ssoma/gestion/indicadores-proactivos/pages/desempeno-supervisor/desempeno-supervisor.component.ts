import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { environment } from '../../../../../../../environments/environment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

export interface DesempenoSupervisorDto {
  supervisorId: number;
  supervisorNombre: string;
  proyectoId: number;
  proyectoNombre: string;
  mes: number;
  anio: number;
  metaRacs: number;
  metaOpt: number;
  metaInspecciones: number;
  metaCharlas: number;
  metaLeccion: number;
  metaEvalContratista: number;
  metaEvalResidente: number;
  actualRacs: number;
  actualOpt: number;
  actualInspecciones: number;
  actualCharlas: number;
  actualLeccion: number;
  actualEvalContratista: number;
  actualEvalResidente: number;
  pctRacs: number;
  pctOpt: number;
  pctInspecciones: number;
  pctCharlas: number;
  pctLeccion: number;
  pctEvalContratista: number;
  pctEvalResidente: number;
  pctGeneral: number;
  fechaLogro100: string | null;
  esPrimeroEnProyecto: boolean;
  pctGeneralMesAnterior: number | null;
  esResidente: boolean;
  esOculto: boolean;
  puedeOcultarse: boolean;
}

interface ProyectoSimple { id: number; nombre: string; }

@Component({
  selector: 'app-desempeno-supervisor',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './desempeno-supervisor.component.html',
  styleUrls: ['./desempeno-supervisor.component.css'],
})
export class DesempenoSupervisorComponent implements OnInit {
  private http     = inject(HttpClient);
  private loader   = inject(LoaderService);
  private errorSvc = inject(ErrorService);

  private base = `${environment.apiUrl}api/v1/ssoma-desempeno-supervisor`;

  mes    = signal<number>(new Date().getMonth() + 1);
  anio   = signal<number>(new Date().getFullYear());
  proyectoFiltro = signal<number | null>(null);
  verOcultos = signal<boolean>(false);

  todos     = signal<DesempenoSupervisorDto[]>([]);
  proyectos = signal<ProyectoSimple[]>([]);

  supervisores = computed(() => {
    return [...this.todos()].sort((a, b) => {
      if (a.esPrimeroEnProyecto !== b.esPrimeroEnProyecto)
        return a.esPrimeroEnProyecto ? -1 : 1;
      return b.pctGeneral - a.pctGeneral;
    });
  });

  promedioProyecto = computed(() => {
    const s = this.supervisores();
    if (!s.length) return 0;
    return s.reduce((acc, x) => acc + x.pctGeneral, 0) / s.length;
  });

  metaSemanal = computed(() => {
    const hoy = new Date();
    const esMesActual = hoy.getMonth() + 1 === this.mes() && hoy.getFullYear() === this.anio();
    if (!esMesActual) return 100;
    const dia = hoy.getDate();
    if (dia <= 7)  return 25;
    if (dia <= 14) return 50;
    if (dia <= 21) return 75;
    return 100;
  });

  // Posición por orden de llegada al 100% (por fechaLogro100), solo si completó
  posicionLogro(s: DesempenoSupervisorDto): number {
    if (!s.fechaLogro100) return 0;
    const completados = this.supervisores()
      .filter(x => x.proyectoId === s.proyectoId && !!x.fechaLogro100)
      .sort((a, b) => new Date(a.fechaLogro100!).getTime() - new Date(b.fechaLogro100!).getTime());
    return completados.findIndex(x => x.supervisorId === s.supervisorId) + 1;
  }

  trofeoClass(pos: number): string {
    if (pos === 1) return 'trofeo--oro';
    if (pos === 2) return 'trofeo--plata';
    if (pos === 3) return 'trofeo--bronce';
    return '';
  }

  semanaActual = computed(() => {
    const hoy = new Date();
    if (hoy.getMonth() + 1 !== this.mes() || hoy.getFullYear() !== this.anio()) return null;
    const dia = hoy.getDate();
    if (dia <= 7)  return 1;
    if (dia <= 14) return 2;
    if (dia <= 21) return 3;
    return 4;
  });

  metaEsperada = computed(() => {
    const semana = this.semanaActual();
    if (semana !== null) return semana * 25;
    const hoy = new Date();
    const mesSelec  = new Date(this.anio(), this.mes() - 1, 1);
    const mesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return mesSelec < mesActual ? 100 : 0;
  });

  meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];
  anios = [2024, 2025, 2026, 2027].map(a => ({ valor: a, nombre: String(a) }));

  readonly INDICADORES = [
    { key: 'Racs',         label: 'RAC',     color: '#0f4c75', icon: 'ti-file-description' },
    { key: 'Opt',          label: 'OPT',     color: '#7c3aed', icon: 'ti-eye' },
    { key: 'Inspecciones', label: 'Insp.',   color: '#0891b2', icon: 'ti-clipboard-check' },
    { key: 'Charlas',      label: 'Charlas', color: '#16a34a', icon: 'ti-presentation' },
  ];

  readonly CHECKS = [
    { key: 'Leccion',         label: 'Lección',     icon: 'ti-bulb' },
    { key: 'EvalContratista', label: 'Contratista', icon: 'ti-building' },
    { key: 'EvalResidente',   label: 'Residente',   icon: 'ti-user-check' },
  ];

  hizo(s: DesempenoSupervisorDto, key: string): boolean {
    return ((s as any)[`actual${key}`] ?? 0) > 0;
  }

  constructor() {
    effect(() => {
      this.mes(); this.anio(); this.proyectoFiltro(); this.verOcultos();
      this.cargar();
    });
  }

  ngOnInit(): void {
    this.http.get<ProyectoSimple[]>(`${environment.apiUrl}api/v1/shared-filters/proyectos`)
      .subscribe({ next: data => this.proyectos.set(data) });
  }

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  cargar(): void {
    this.loader.show();
    let params = new HttpParams()
      .set('mes', this.mes())
      .set('anio', this.anio())
      .set('incluirOcultos', this.verOcultos());
    const pid = this.proyectoFiltro();
    if (pid) params = params.set('proyectoId', pid);
    this.http.get<DesempenoSupervisorDto[]>(this.base, { headers: this.authHeaders(), params }).subscribe({
      next: data => { this.todos.set(data); this.loader.hide(); },
      error: err  => { this.loader.hide(); this.errorSvc.handleError(err); },
    });
  }

  toggleOculto(s: DesempenoSupervisorDto): void {
    const accion = s.esOculto ? 'mostrar' : 'ocultar';
    this.http.patch<void>(`${this.base}/${s.supervisorId}/${accion}`, {}, { headers: this.authHeaders() }).subscribe({
      next: () => this.cargar(),
      error: err => this.errorSvc.handleError(err),
    });
  }

  nombreMes(mes: number): string {
    return this.meses.find(m => m.valor === mes)?.nombre ?? '';
  }

  iniciales(nombre: string): string {
    return nombre.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  pct(s: DesempenoSupervisorDto, key: string): number {
    return (s as any)[`pct${key}`] ?? 0;
  }

  actual(s: DesempenoSupervisorDto, key: string): number {
    return (s as any)[`actual${key}`] ?? 0;
  }

  meta(s: DesempenoSupervisorDto, key: string): number {
    return (s as any)[`meta${key}`] ?? 0;
  }

  barW(pct: number): string { return `${Math.min(100, pct)}%`; }

  superaEnAlguno(s: DesempenoSupervisorDto): boolean {
    return s.pctGeneral >= this.metaSemanal();
  }

  nombreTitleCase(nombre: string): string {
    return nombre.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  metaMarkerLeft(): string { return `${this.metaEsperada()}%`; }

  tendenciaDelta(s: DesempenoSupervisorDto): number | null {
    if (s.pctGeneralMesAnterior == null) return null;
    return Math.round((s.pctGeneral - s.pctGeneralMesAnterior) * 10) / 10;
  }

  ritmoCardClass(s: DesempenoSupervisorDto): string {
    const meta = this.metaEsperada();
    if (!meta || s.pctGeneral >= 100) return '';
    if (s.pctGeneral < meta * 0.8) return 'sup-card--riesgo';
    if (s.pctGeneral < meta)        return 'sup-card--cerca';
    return '';
  }

  exportarPdf(): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    const mes    = this.nombreMes(this.mes());
    const anio   = this.anio();
    const proy   = this.proyectos().find(p => p.id === this.proyectoFiltro())?.nombre ?? 'Todos los proyectos';

    doc.setFontSize(13);
    doc.text(`Desempeño del Supervisor — ${mes} ${anio}`, 14, 14);
    doc.setFontSize(9);
    doc.text(`Proyecto: ${proy}`, 14, 20);

    autoTable(doc, {
      startY: 25,
      head: [['Supervisor', 'Proyecto', '%', 'RAC', 'OPT', 'Insp.', 'Charlas', 'Lección', 'Contratista', 'Residente', 'Tend.']],
      body: this.supervisores().map(s => [
        this.nombreTitleCase(s.supervisorNombre),
        s.proyectoNombre,
        `${s.pctGeneral}%`,
        `${s.actualRacs}/${s.metaRacs}`,
        `${s.actualOpt}/${s.metaOpt}`,
        `${s.actualInspecciones}/${s.metaInspecciones}`,
        `${s.actualCharlas}/${s.metaCharlas}`,
        s.actualLeccion > 0 ? '✓' : '—',
        s.actualEvalContratista > 0 ? '✓' : '—',
        s.actualEvalResidente > 0 ? '✓' : '—',
        this.tendenciaDelta(s) != null
          ? (this.tendenciaDelta(s)! >= 0 ? `▲${this.tendenciaDelta(s)}%` : `▼${Math.abs(this.tendenciaDelta(s)!)}%`)
          : '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [15, 76, 117], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`desempeno-supervisor-${mes}-${anio}.pdf`);
  }

  colorClass(pct: number): string {
    if (pct >= 100) return 'c-verde';
    if (pct >= 75)  return 'c-amarillo';
    if (pct >= 50)  return 'c-naranja';
    return 'c-rojo';
  }

  promedioClass(p: number): string {
    if (p >= 90) return 'c-verde';
    if (p >= 70) return 'c-amarillo';
    if (p >= 50) return 'c-naranja';
    return 'c-rojo';
  }

  ritmoClass(s: DesempenoSupervisorDto): string {
    const meta = this.metaEsperada();
    if (!meta || s.pctGeneral >= 100) return '';
    if (s.pctGeneral >= meta)         return 'ritmo-ok';
    if (s.pctGeneral >= meta * 0.8)   return 'ritmo-cerca';
    return 'ritmo-atras';
  }

  ritmoLabel(s: DesempenoSupervisorDto): string {
    const meta = this.metaEsperada();
    const sem  = this.semanaActual();
    if (!meta || !sem || s.pctGeneral >= 100) return '';
    if (s.pctGeneral >= meta) return `Al ritmo · sem ${sem}`;
    return `↓ Meta sem ${sem}: ${meta}%`;
  }

  mostrarRitmo(s: DesempenoSupervisorDto): boolean {
    return !!this.semanaActual() && s.pctGeneral < 100;
  }
}
