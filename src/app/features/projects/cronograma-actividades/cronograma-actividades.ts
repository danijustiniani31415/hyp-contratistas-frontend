import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { gantt } from 'dhtmlx-gantt';
import { CronogramaActividadesService } from './services/cronograma-actividades.service';
import {
  ActividadDto,
  ActividadesProyectoResponseDto,
  ProyectoCronogramaHeaderDto,
  CrearActividadRequest,
  EditarActividadRequest,
  EditarActividadResultDto,
  ReordenarItem,
  CascadaResultDto,
  CascadaCambioDto,
  ImportarMppResultDto,
  CrearActividadMasivoItem,
  CrearActividadesMasivoResultDto,
  UltimaPestanaDto,
  AplicarPlantillaResultDto,
} from './dtos/cronograma-actividades.dtos';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { AuthService } from '../../../core/services/auth.service';
import { Roles } from '../../../core/constants/roles';
import { SectionTabs } from '../../../shared/components/section-tabs/section-tabs';

interface PredResultItem {
  act: ActividadDto;
  disabled: boolean;
  hint: string;
}

@Component({
  selector: 'app-cronograma-actividades',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SectionTabs],
  templateUrl: './cronograma-actividades.html',
  styleUrl: './cronograma-actividades.css',
})
export class CronogramaActividades implements OnInit, OnDestroy {
  // Datos
  proyectoHeader: ProyectoCronogramaHeaderDto | null = null;
  actividades: ActividadDto[] = [];
  selectedProyectoId: number | null = null;

  get porcentajeAvanceGlobal(): number {
    if (!this.actividades.length) return 0;
    const sum = this.actividades.reduce((acc, a) => acc + (a.progressPercentage || 0), 0);
    return Math.round(sum / this.actividades.length);
  }

  // Cargas
  loadingActividades = false;
  guardando = false;

  // Modal crear/editar
  modalOpen = false;
  modalMode: 'crear' | 'editar' = 'crear';
  editandoId: number | null = null;
  editandoAct: ActividadDto | null = null;

  // Modal importar MPP
  mppModalOpen = false;
  mppFile: File | null = null;
  importando = false;

  // Jerarquía
  collapsedIds  = new Set<number>();
  ganttModalAct: ActividadDto | null = null;
  private parentIds = new Set<number>();
  private rowStyleMap = new Map<number, { color: string; text?: string }>();
  /** Posición de cada rama raíz entre las ramas raíz (1ª, 2ª, 3ª...) — para el badge de fase, no confundir con getDisplayIndex() (posición de fila en el árbol completo). */
  private phaseIndexMap = new Map<number, number>();
  private avanceMap = new Map<number, number>();

  // Drag & Drop
  dragSrc: ActividadDto | null = null;   // actividad siendo arrastrada
  dragActId: number | null = null;       // id para clase CSS row-dragging
  dropTargetId: number | null = null;
  dropPosition: 'before' | 'after' | 'inside' | null = null;
  guardandoOrden = false;

  // Crear: nivel y padre
  formNivel = 1;
  formPadreId: number | null = null;
  private readonly NIVEL0 = { bg: '#1B263B', text: '#E0E1DD' } as const;
  private readonly GANTT_WEEK_PX = 50;
  private readonly GANTT_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  // Paleta corporativa — debe coincidir con las 10 custom properties --corporate-* del .css
  private readonly LEVEL1_COLORS = [
    '#5E6AD2', // indigo
    '#2E7D6A', // salvia
    '#4F709C', // steel
    '#B08B5C', // bronze
    '#A35D6A', // clay
    '#64748B', // slate
    '#6D5C7E', // amethyst
    '#115E59', // forest
    '#A06A3A', // ochre
    '#475569', // graphite
  ];
  private readonly DARK_TEXT = '#2C2C2A';

  // Formulario del modal
  formActividad = '';
  formPlannedStart = '';
  formPlannedEnd = '';
  formActualEnd = '';
  formProgress = 0;
  errorFechaReal = false;

  // Predecesoras
  formPredecesoras: number[] = [];
  predSearch = '';
  predDropdownIdx = -1;

  @ViewChild('predInput') predInputRef?: ElementRef<HTMLInputElement>;

  // Modal de cascada
  cascadaModalOpen = false;
  cascadaPreview: CascadaResultDto | null = null;
  aplicandoCascada = false;

  // Línea base
  lineaBaseVisible = true;

  // Duración en modal crear
  nuevaDuracionDias: number | null = null;

  // Edición inline — popover flotante
  private inlineEditInFlight = false;
  inlineEditCell: { id: number; field: 'start' | 'end' | 'lbStart' | 'lbEnd' } | null = null;
  inlineEditValue = '';
  inlinePopoverPos = { top: 0, left: 0 };

  @ViewChild('popoverDateInput') popoverDateInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('ganttContainer') ganttContainerRef?: ElementRef;

  // Vista Gantt dhtmlx
  vistaGantt = false;

  // Pestañas de tipo cronograma
  tipoCronogramaActivo: string | null = null;

  // Modal creación masiva
  masivoModalOpen = false;
  guardandoMasivo = false;
  masivoFilas: { nombre: string; inicioProgramado: string; finProgramado: string }[] = [];
  readonly cronogramaTabs = [
    { id: 'ANTEPROYECTO',          label: 'Anteproyecto' },
    { id: 'PROYECTO',              label: 'Proyecto' },
    { id: 'PROYECTO_ACTUALIZACION', label: 'Proyecto de Actualización' },
  ];

  constructor(
    private service: CronogramaActividadesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  get esAdmin(): boolean {
    return (
      this.authService.hasRole(Roles.ADMINISTRADOR_UDP) ||
      this.authService.hasRole(Roles.ADMINISTRADOR_RESIDENTES)
    );
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('proyectoId'));
    if (!id) {
      this.volver();
      return;
    }
    this.selectedProyectoId = id;
    this.cargarUltimaPestana(id);
  }

  private cargarUltimaPestana(proyectoId: number): void {
    this.service.getUltimaPestana(proyectoId).subscribe({
      next: (res: UltimaPestanaDto) => {
        this.tipoCronogramaActivo = res.tipoCronograma ?? 'ANTEPROYECTO';
        this.loadActividades(proyectoId);
      },
      error: () => {
        this.tipoCronogramaActivo = 'ANTEPROYECTO';
        this.loadActividades(proyectoId);
      },
    });
  }

  onTabChange(id: string): void {
    this.tipoCronogramaActivo = id;
    this.actividades = [];
    this.collapsedIds.clear();
    if (this.vistaGantt) {
      this.destroyGanttView();
      this.vistaGantt = false;
    }
    this.loadActividades(this.selectedProyectoId!);
    this.guardarUltimaPestana(id);
  }

  /** Preferencia de UI, no crítica: se guarda en segundo plano sin loading ni error visible. */
  private guardarUltimaPestana(tipoCronograma: string): void {
    if (!this.selectedProyectoId) return;
    this.service.actualizarUltimaPestana(this.selectedProyectoId, tipoCronograma).subscribe({
      next: () => {},
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    gantt.clearAll();
  }

  volver(): void {
    this.router.navigate(['/projects/cronograma-actividades']);
  }

  // ── Carga de datos ─────────────────────────────────────────────────────────

  private loadActividades(proyectoId: number): void {
    this.loadingActividades = true;
    this.loaderService.show();
    this.service.getActividades(proyectoId, this.tipoCronogramaActivo!).subscribe({
      next: (res: ActividadesProyectoResponseDto) => {
        this.proyectoHeader = res.proyecto;
        this.actividades    = res.actividades ?? [];
        this.buildParentIds();
        this.buildColorMap();
        this.buildAvanceMap();
        this.loadingActividades = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingActividades = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Jerarquía ─────────────────────────────────────────────────────────────

  private buildParentIds(): void {
    this.parentIds = new Set(
      this.actividades.filter((a) => a.parentId !== null).map((a) => a.parentId!),
    );
  }

  private buildColorMap(): void {
    this.rowStyleMap.clear();
    this.phaseIndexMap.clear();

    // ── Paso 1: color base por rama ──────────────────────────────────────────
    // Cada nodo raíz (sin padre) recibe uno de los 10 colores base, cicleando
    // SOLO entre raíces en el orden en que aparecen. Sus descendientes heredan
    // ESE mismo color base; nunca uno nuevo del ciclo. rootIdx también es la
    // base del número de fase del badge (.phase-badge, ver getFaseIndex) —
    // 1ª, 2ª, 3ª rama raíz, NO getDisplayIndex() (que es la posición de fila
    // en el árbol completo, el bug que se reportó: mostraba fila 1/9/22/27/75
    // en vez de fase 1/2/3/4/5).
    let rootIdx = 0;
    for (const act of this.actividades) {
      if (act.parentId == null) {
        const color = this.LEVEL1_COLORS[rootIdx % this.LEVEL1_COLORS.length];
        this.rowStyleMap.set(act.projectActivityId, { color, text: this.getBranchTextColor(color) });
        this.phaseIndexMap.set(act.projectActivityId, rootIdx + 1);
        rootIdx++;
      }
    }

    // ── Paso 2: descendientes heredan el color base de su raíz ────────────────
    // Los tonos de nivel 2/3+ (fondo/borde/texto) y la línea conectora del
    // árbol se derivan en CSS con color-mix() a partir de --branch-color (ver
    // getRowStyle y las reglas .lvl-0/.lvl-1/.lvl-2/.lvl-deep/.tree-* en el .css).
    for (const act of this.actividades) {
      if (act.parentId == null) continue;
      const base = this.findRootColor(act) ?? '#415a77';
      this.rowStyleMap.set(act.projectActivityId, { color: base });
    }
  }

  /** Sube por la jerarquía hasta la raíz y devuelve su color base heredado. */
  private findRootColor(act: ActividadDto): string | null {
    let cur: ActividadDto | undefined = act;
    // Límite de seguridad por si hubiera un ciclo en los datos.
    for (let i = 0; cur && cur.parentId != null && i < 100; i++) {
      cur = this.actividades.find((a) => a.projectActivityId === cur!.parentId);
    }
    return cur ? (this.rowStyleMap.get(cur.projectActivityId)?.color ?? null) : null;
  }

  /** Texto legible (blanco o gris oscuro) para el fondo sólido de una rama nivel 1, según contraste WCAG AA (≥4.5:1). */
  private getBranchTextColor(hex: string): string {
    return this.contrastRatio(hex, '#ffffff') >= 4.5 ? '#ffffff' : this.DARK_TEXT;
  }

  private relativeLuminance(hex: string): number {
    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const r = toLinear(parseInt(hex.slice(1, 3), 16) / 255);
    const g = toLinear(parseInt(hex.slice(3, 5), 16) / 255);
    const b = toLinear(parseInt(hex.slice(5, 7), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private contrastRatio(hexA: string, hexB: string): number {
    const lA = this.relativeLuminance(hexA) + 0.05;
    const lB = this.relativeLuminance(hexB) + 0.05;
    return lA > lB ? lA / lB : lB / lA;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getRowStyle(act: ActividadDto): Record<string, string> {
    const info = this.rowStyleMap.get(act.projectActivityId);
    if (!info) {
      // Fallback: nivel 0 aún no está en el mapa (p.ej. llamado antes de que corra buildColorMap)
      if ((act.hierarchyLevel ?? 0) <= 0 && act.parentId == null) {
        return { '--branch-color': this.NIVEL0.bg };
      }
      return {};
    }
    return { '--branch-color': info.color };
  }

  /**
   * Ningún nivel usa fondo sólido en el sistema de color jerárquico actual
   * (línea conectora + badge de fase, acentos vía border-left) — se mantiene
   * el método porque `getBadgeStyle`/`getFechaRealStyle`/el template siguen
   * llamándolo, pero siempre toma la variante clara.
   */
  isDarkBg(_act: ActividadDto): boolean {
    return false;
  }

  /**
   * Clase de nivel para la fila, única fuente de verdad para el CSS jerárquico
   * (.lvl-0/.lvl-1/.lvl-2/.lvl-deep). Coerciona a Number() por si el valor llega
   * como string desde el backend, y cualquier valor que no sea exactamente 0/1/2
   * (incluido NaN, null u hondos >2) cae en 'lvl-deep' — nunca deja una fila sin
   * clase de nivel, sin importar cuán profundo sea el árbol real (la plantilla
   * "Proyecto" ya llega a hierarchyLevel 4).
   */
  /** Número de fase para el badge de nivel 1 (.phase-badge): 1ª, 2ª, 3ª rama raíz — no la posición de fila (ver phaseIndexMap en buildColorMap). */
  getFaseIndex(act: ActividadDto): number {
    return this.phaseIndexMap.get(act.projectActivityId) ?? 0;
  }

  getNivelClase(act: ActividadDto): 'lvl-0' | 'lvl-1' | 'lvl-2' | 'lvl-deep' {
    const nivel = Number(act.hierarchyLevel);
    if (nivel === 0) return 'lvl-0';
    if (nivel === 1) return 'lvl-1';
    if (nivel === 2) return 'lvl-2';
    return 'lvl-deep';
  }

  /**
   * Mitad del ancho del badge de fase (20px de diámetro → 10px), usada solo
   * para calcular el ancho del codo horizontal del conector (.tree-elbow en
   * el .html). La posición x del tronco en sí (18px = padding-left de
   * .td-actividad + esta mitad) vive hardcodeada en el .css (.tree-trunk/
   * .tree-elbow) porque position:absolute no hereda el padding del
   * contenedor — ver el comentario ahí si hay que recalcularla.
   */
  readonly badgeHalfWidth = 10;

  /**
   * true si `act` es el último descendiente VISIBLE de su rama (no hay otro
   * descendiente visible más abajo antes de que empiece la siguiente rama).
   * Determina si el tronco vertical de la línea conectora sigue de largo
   * (hacia la fila siguiente) o se detiene a la mitad de esta fila — nunca
   * "cuelga" más allá del último hijo real.
   */
  esUltimoDeRama(act: ActividadDto): boolean {
    const idx = this.actividades.findIndex((a) => a.projectActivityId === act.projectActivityId);
    for (let i = idx + 1; i < this.actividades.length; i++) {
      const siguiente = this.actividades[i];
      if (siguiente.hierarchyLevel === 0) return true; // arrancó una rama nueva
      if (this.isVisible(siguiente)) return false; // sigue habiendo descendientes visibles en esta rama
    }
    return true;
  }

  getBadgeStyle(act: ActividadDto): Record<string, string> {
    if (this.isDarkBg(act)) {
      const estado = this.getEstado(act);
      const map: Record<string, { bg: string; fg: string }> = {
        CULMINADA:    { bg: '#86efac', fg: '#14532d' },
        VENCIDO:      { bg: '#fca5a5', fg: '#7f1d1d' },
        'EN PROGRESO':{ bg: '#93c5fd', fg: '#1e3a5f' },
      };
      const s = map[estado] ?? { bg: 'rgba(255,255,255,0.15)', fg: '#ffffff' };
      return { 'background-color': s.bg, color: s.fg };
    }
    return {};
  }

  getFechaRealStyle(act: ActividadDto): Record<string, string> {
    if (!act.actualEndDate) {
      // "—" en color secundario: usa la opacidad del CSS (0.75 en td-fecha) sin override
      return {};
    }
    return {
      color: this.isDarkBg(act) ? '#90CAF9' : '#1d4ed8',
      fontWeight: '600',
      opacity: '1', // anula el opacity: 0.75 que .td-fecha aplica sobre filas coloreadas
    };
  }

  hasChildren(act: ActividadDto): boolean {
    return this.parentIds.has(act.projectActivityId);
  }

  isVisible(act: ActividadDto): boolean {
    if (act.parentId === null) return true;
    if (this.collapsedIds.has(act.parentId)) return false;
    const parent = this.actividades.find((a) => a.projectActivityId === act.parentId);
    return parent ? this.isVisible(parent) : true;
  }

  toggleCollapse(act: ActividadDto, event: MouseEvent): void {
    event.stopPropagation();
    if (this.collapsedIds.has(act.projectActivityId)) {
      this.collapsedIds.delete(act.projectActivityId);
    } else {
      this.collapsedIds.add(act.projectActivityId);
    }
  }

  onRowClick(act: ActividadDto): void {
    this.abrirModalEditar(act);
  }

  // ── Modal Gantt (nivel 1) ──────────────────────────────────────────────────

  abrirGanttModal(act: ActividadDto): void {
    this.ganttModalAct = act;
    setTimeout(() => {
      const col = document.querySelector('.gantt-chart-col') as HTMLElement | null;
      if (!col) return;
      const kids  = this.getGanttChildren(act);
      const range = this.getGanttRange(kids);
      if (!range) return;
      const weeks  = this.getGanttWeeks(range);
      const todayPx = this.getScrollToToday(range, weeks);
      col.scrollLeft = Math.max(0, todayPx - col.clientWidth / 2);
    }, 0);
  }
  cerrarGanttModal(): void                   { this.ganttModalAct = null; }

  onGanttOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarGanttModal();
    }
  }

  getGanttAccentColor(act: ActividadDto): string {
    return this.rowStyleMap.get(act.projectActivityId)?.color ?? '#415a77';
  }

  getGanttChildren(act: ActividadDto): ActividadDto[] {
    return this.actividades.filter((a) => a.parentId === act.projectActivityId);
  }

  getGanttRange(kids: ActividadDto[]): { min: Date; max: Date } | null {
    const ts: number[] = [];
    for (const k of kids) {
      if (k.plannedStartDate) ts.push(new Date(k.plannedStartDate).getTime());
      if (k.plannedEndDate)   ts.push(new Date(k.plannedEndDate).getTime());
    }
    if (!ts.length) return null;
    return { min: new Date(Math.min(...ts)), max: new Date(Math.max(...ts)) };
  }

  // ── Gantt: cálculos de semanas/meses/barras ────────────────────────────────

  getGanttWeeks(range: { min: Date; max: Date }): { startDate: Date; label: string; isCurrentWeek: boolean }[] {
    const firstMonday = new Date(range.min);
    const dow = firstMonday.getDay();
    firstMonday.setDate(firstMonday.getDate() - (dow === 0 ? 6 : dow - 1));
    firstMonday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeks: { startDate: Date; label: string; isCurrentWeek: boolean }[] = [];
    let cur = new Date(firstMonday);
    const limit = new Date(range.max.getTime() + this.GANTT_WEEK_MS);

    while (cur <= limit) {
      const weekEnd = new Date(cur.getTime() + this.GANTT_WEEK_MS - 1);
      const dd = String(cur.getDate()).padStart(2, '0');
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      weeks.push({
        startDate: new Date(cur),
        label: `${dd}/${mm}`,
        isCurrentWeek: today >= cur && today <= weekEnd,
      });
      cur = new Date(cur.getTime() + this.GANTT_WEEK_MS);
    }
    return weeks;
  }

  getGanttMonths(weeks: { startDate: Date }[]): { label: string; spanWeeks: number }[] {
    const NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const months: { label: string; spanWeeks: number }[] = [];
    for (const w of weeks) {
      const lbl = `${NAMES[w.startDate.getMonth()]} ${w.startDate.getFullYear()}`;
      const last = months[months.length - 1];
      if (last && last.label === lbl) { last.spanWeeks++; }
      else { months.push({ label: lbl, spanWeeks: 1 }); }
    }
    return months;
  }

  getBarLayerStyle(kid: ActividadDto, weeks: { startDate: Date }[]): Record<string, string> {
    if (!kid.plannedStartDate || !kid.plannedEndDate || !weeks.length) return { display: 'none' };
    const origin = weeks[0].startDate.getTime();
    const start  = new Date(kid.plannedStartDate).getTime();
    const end    = new Date(kid.plannedEndDate).getTime();
    const leftPx  = Math.max(0, (start - origin) / this.GANTT_WEEK_MS * this.GANTT_WEEK_PX);
    const widthPx = Math.max(4, (end - start) / this.GANTT_WEEK_MS * this.GANTT_WEEK_PX);
    return { left: `${leftPx}px`, width: `${widthPx}px` };
  }

  getTodayPosition(range: { min: Date; max: Date }, weeks: { startDate: Date }[]): string | null {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (hoy < range.min || hoy > range.max || !weeks.length) return null;
    const origin = weeks[0].startDate.getTime();
    const px = (hoy.getTime() - origin) / this.GANTT_WEEK_MS * this.GANTT_WEEK_PX;
    return `${px}px`;
  }

  getScrollToToday(range: { min: Date; max: Date }, weeks: { startDate: Date }[]): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (!weeks.length) return 0;
    const origin = weeks[0].startDate.getTime();
    return Math.max(0, (hoy.getTime() - origin) / this.GANTT_WEEK_MS * this.GANTT_WEEK_PX);
  }

  getGanttBarColorAlpha(act: ActividadDto): string {
    const color = this.rowStyleMap.get(act.projectActivityId)?.color;
    return color ? this.hexToRgba(color, 0.22) : 'rgba(65, 90, 119, 0.22)';
  }

  getGanttChartWidth(weeks: unknown[]): number {
    return weeks.length * this.GANTT_WEEK_PX;
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  /** true si `target` comparte el mismo parentId que la actividad en curso. */
  private mismoParentId(target: ActividadDto): boolean {
    if (!this.dragSrc) return false;
    const pid = this.dragSrc.parentId;
    return pid === null ? target.parentId === null : target.parentId === pid;
  }

  /** La línea indicadora solo aparece si el destino es un candidato válido. */
  canDropOn(target: ActividadDto): boolean {
    if (!this.dragSrc || this.dragSrc.projectActivityId === target.projectActivityId) return false;
    if (!this.isVisible(target)) return false;
    return this.mismoParentId(target);
  }

  onDragStart(act: ActividadDto, event: DragEvent): void {
    this.dragSrc = act;
    this.dragActId = act.projectActivityId;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(act.projectActivityId));
    const orderCell = event.currentTarget as HTMLElement;
    const row = orderCell.closest('tr') as HTMLElement | null;
    if (row && event.dataTransfer) {
      const rect = row.getBoundingClientRect();
      event.dataTransfer.setDragImage(row, event.clientX - rect.left, event.clientY - rect.top);
    }
  }

  onDragOver(act: ActividadDto, event: DragEvent): void {
    if (!this.dragSrc || this.dragSrc.projectActivityId === act.projectActivityId) return;
    if (!this.isVisible(act)) return;

    const row = event.currentTarget as HTMLElement;
    const rect = row.getBoundingClientRect();
    const relPct = (event.clientY - rect.top) / rect.height;

    let zone: 'before' | 'after' | 'inside';
    if (relPct < 0.2) zone = 'before';
    else if (relPct > 0.8) zone = 'after';
    else zone = 'inside';

    if (zone === 'before' || zone === 'after') {
      if (!this.mismoParentId(act)) return;
    } else {
      if (!this.canDropInside(act)) return;
    }

    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dropTargetId = act.projectActivityId;
    this.dropPosition = zone;
  }

  onDragLeave(act: ActividadDto, event: DragEvent): void {
    if (this.dropTargetId !== act.projectActivityId) return;
    const related = event.relatedTarget as Node | null;
    if (!(event.currentTarget as HTMLElement).contains(related)) {
      this.dropTargetId = null;
      this.dropPosition = null;
    }
  }

  onDragEnd(): void {
    this.dragSrc = null;
    this.dragActId = null;
    this.dropTargetId = null;
    this.dropPosition = null;
  }

  /**
   * Devuelve el subárbol de la actividad en srcIdx: ella misma + todos sus
   * descendientes que aparecen contiguos inmediatamente después en el array
   * (orden depth-first que retorna el backend).
   */
  private getSubtreeSlice(srcIdx: number): ActividadDto[] {
    const slice = [this.actividades[srcIdx]];
    const ids = new Set<number>([this.actividades[srcIdx].projectActivityId]);
    for (let i = srcIdx + 1; i < this.actividades.length; i++) {
      const a = this.actividades[i];
      if (a.parentId !== null && ids.has(a.parentId)) {
        slice.push(a);
        ids.add(a.projectActivityId);
      } else {
        break;
      }
    }
    return slice;
  }

  private getSubtreeMaxLevel(actId: number): number {
    const act = this.actividades.find((a) => a.projectActivityId === actId);
    if (!act) return 0;
    const children = this.actividades.filter((a) => a.parentId === actId);
    if (!children.length) return act.hierarchyLevel;
    return Math.max(act.hierarchyLevel, ...children.map((c) => this.getSubtreeMaxLevel(c.projectActivityId)));
  }

  private isDescendant(actId: number, ancestorId: number): boolean {
    const act = this.actividades.find((a) => a.projectActivityId === actId);
    if (!act || act.parentId === null) return false;
    if (act.parentId === ancestorId) return true;
    return this.isDescendant(act.parentId, ancestorId);
  }

  private canDropInside(target: ActividadDto): boolean {
    if (!this.dragSrc) return false;
    if (this.isDescendant(target.projectActivityId, this.dragSrc.projectActivityId)) return false;
    const newSrcLevel = target.hierarchyLevel + 1;
    if (newSrcLevel > 3) return false;
    const levelDiff = newSrcLevel - this.dragSrc.hierarchyLevel;
    return this.getSubtreeMaxLevel(this.dragSrc.projectActivityId) + levelDiff <= 3;
  }

  onDrop(act: ActividadDto, event: DragEvent): void {
    event.preventDefault();

    const src = this.dragSrc;
    const dropPos = this.dropPosition;
    this.dragSrc = null;
    this.dragActId = null;
    this.dropTargetId = null;
    this.dropPosition = null;

    if (!src || !dropPos) return;

    // ── Zona central: anidar bajo la fila destino ────────────────────────────
    if (dropPos === 'inside') {
      this.loaderService.show();
      this.service.bajarNivel(this.selectedProyectoId!, src.projectActivityId, act.projectActivityId).subscribe({
        next: () => { this.loaderService.hide(); this.recargarConEstado(); },
        error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
      });
      return;
    }

    // ── Zona borde: reordenar entre hermanos ─────────────────────────────────
    const srcPid = src.parentId;
    const tgtPid = act.parentId;
    const mismoParent = srcPid === null ? tgtPid === null : tgtPid === srcPid;
    if (!mismoParent || src.projectActivityId === act.projectActivityId) return;

    this.reordenarEnLista(src, act, dropPos as 'before' | 'after');
  }

  private reordenarEnLista(src: ActividadDto, dest: ActividadDto, position: 'before' | 'after'): void {
    const srcIdx = this.actividades.findIndex((a) => a.projectActivityId === src.projectActivityId);
    if (srcIdx === -1) return;
    const subtree = this.getSubtreeSlice(srcIdx);
    const subtreeIds = new Set(subtree.map((a) => a.projectActivityId));

    const listaPlana = this.actividades.filter((a) => !subtreeIds.has(a.projectActivityId));

    const tgtIdx = listaPlana.findIndex((a) => a.projectActivityId === dest.projectActivityId);
    if (tgtIdx === -1) return;

    listaPlana.splice(position === 'before' ? tgtIdx : tgtIdx + 1, 0, ...subtree);

    const sinCambio = listaPlana.every(
      (a, i) => a.projectActivityId === this.actividades[i].projectActivityId,
    );
    if (sinCambio) return;

    const items: ReordenarItem[] = listaPlana.map((a, i) => ({
      projectActivityId: a.projectActivityId,
      order: i + 1,
    }));

    this.guardandoOrden = true;
    this.loaderService.show();
    this.service.reordenarActividades(this.selectedProyectoId!, items).subscribe({
      next: () => {
        this.actividades = listaPlana;
        this.buildParentIds();
        this.buildColorMap();
        this.buildAvanceMap();
        this.guardandoOrden = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoOrden = false;
        this.loaderService.hide();
        const msg = typeof err.error === 'string'
          ? err.error
          : (err.error?.message ?? err.error?.detail ?? err.message ?? 'Ocurrió un error.');
        Swal.fire({ icon: 'error', title: 'Error al reordenar', text: msg, confirmButtonColor: '#2596be' });
      },
    });
  }

  // ── Cambio de jerarquía ────────────────────────────────────────────────────

  canSubirNivel(act: ActividadDto): boolean {
    return act.hierarchyLevel > 0;
  }

  canBajarNivel(act: ActividadDto): boolean {
    return act.hierarchyLevel < 3;
  }

  subirNivelActividad(act: ActividadDto, event: MouseEvent): void {
    event.stopPropagation();
    this.loaderService.show();
    this.service.subirNivel(this.selectedProyectoId!, act.projectActivityId).subscribe({
      next: () => { this.loaderService.hide(); this.recargar(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  bajarNivelActividad(act: ActividadDto, event: MouseEvent): void {
    event.stopPropagation();
    const actIdx = this.actividades.findIndex((a) => a.projectActivityId === act.projectActivityId);
    let newParent: ActividadDto | null = null;
    for (let i = actIdx - 1; i >= 0; i--) {
      if (this.actividades[i].hierarchyLevel === act.hierarchyLevel) {
        newParent = this.actividades[i];
        break;
      }
    }
    if (!newParent) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin padre disponible',
        text: 'No hay un padre disponible para asignar esta actividad.',
        confirmButtonColor: '#2596be',
      });
      return;
    }
    this.loaderService.show();
    this.service.bajarNivel(this.selectedProyectoId!, act.projectActivityId, newParent.projectActivityId).subscribe({
      next: () => { this.loaderService.hide(); this.recargar(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  // ── Mover entre hermanos ──────────────────────────────────────────────────

  private getSiblings(act: ActividadDto): ActividadDto[] {
    return this.actividades.filter((a) => a.parentId === act.parentId);
  }

  canMoveUp(act: ActividadDto): boolean {
    const sibs = this.getSiblings(act);
    return sibs.length > 1 && sibs[0].projectActivityId !== act.projectActivityId;
  }

  canMoveDown(act: ActividadDto): boolean {
    const sibs = this.getSiblings(act);
    return sibs.length > 1 && sibs[sibs.length - 1].projectActivityId !== act.projectActivityId;
  }

  moveUp(act: ActividadDto, event: MouseEvent): void {
    event.stopPropagation();
    const sibs = this.getSiblings(act);
    const idx = sibs.findIndex((s) => s.projectActivityId === act.projectActivityId);
    if (idx <= 0) return;
    this.reordenarEnLista(act, sibs[idx - 1], 'before');
  }

  moveDown(act: ActividadDto, event: MouseEvent): void {
    event.stopPropagation();
    const sibs = this.getSiblings(act);
    const idx = sibs.findIndex((s) => s.projectActivityId === act.projectActivityId);
    if (idx >= sibs.length - 1) return;
    this.reordenarEnLista(act, sibs[idx + 1], 'after');
  }

  // ── Crear con nivel ────────────────────────────────────────────────────────

  get padresDisponibles(): ActividadDto[] {
    if (this.formNivel <= 1) return [];
    return this.actividades.filter((a) => a.hierarchyLevel === this.formNivel - 1);
  }

  onFormNivelChange(nivel: number): void {
    this.formNivel = nivel;
    this.formPadreId = null;
  }

  // ── Utilidades de formato ──────────────────────────────────────────────────

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    const p = date.slice(0, 10).split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
  }

  getEstado(act: ActividadDto): 'CULMINADA' | 'VENCIDO' | 'EN PROGRESO' {
    if (this.getAvance(act) === 100) return 'CULMINADA';
    if (!act.plannedEndDate) return 'EN PROGRESO';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(act.plannedEndDate);
    fin.setHours(0, 0, 0, 0);
    return hoy > fin ? 'VENCIDO' : 'EN PROGRESO';
  }

  getEstadoCss(act: ActividadDto): string {
    const e = this.getEstado(act);
    if (e === 'CULMINADA')  return 'badge-verde';
    if (e === 'VENCIDO')    return 'badge-rojo';
    return 'badge-azul'; // EN PROGRESO
  }

  private buildAvanceMap(): void {
    this.avanceMap.clear();
    for (const act of this.actividades) {
      this.calcularAvance(act.projectActivityId);
    }
  }

  private calcularAvance(actividadId: number): number {
    if (this.avanceMap.has(actividadId)) return this.avanceMap.get(actividadId)!;
    const hijos = this.actividades.filter((a) => a.parentId === actividadId);
    let result: number;
    if (hijos.length === 0) {
      const act = this.actividades.find((a) => a.projectActivityId === actividadId);
      result = act ? (act.actualEndDate ? 100 : (act.progressPercentage ?? 0)) : 0;
    } else {
      const suma = hijos.reduce((acc, h) => acc + this.calcularAvance(h.projectActivityId), 0);
      result = Math.round(suma / hijos.length);
    }
    this.avanceMap.set(actividadId, result);
    return result;
  }

  getDisplayIndex(act: ActividadDto): number {
    return this.actividades.findIndex((a) => a.projectActivityId === act.projectActivityId) + 1;
  }

  getAvance(act: ActividadDto): number {
    return this.avanceMap.get(act.projectActivityId) ?? (act.actualEndDate ? 100 : act.progressPercentage);
  }

  getBarFillColor(act: ActividadDto): string {
    const info = this.rowStyleMap.get(act.projectActivityId);
    return info?.color ?? '#415a77';
  }

  getAvanceColor(pct: number): string {
    if (pct === 100) return 'fill-verde';
    if (pct >= 70) return 'fill-azul';
    if (pct >= 31) return 'fill-amarillo';
    return 'fill-rojo';
  }

  // ── Modal ──────────────────────────────────────────────────────────────────

  abrirModalCrear(): void {
    this.abrirModalMasivo();
  }

  // ── Modal creación masiva ──────────────────────────────────────────────────

  abrirModalMasivo(): void {
    this.masivoFilas = [{ nombre: '', inicioProgramado: '', finProgramado: '' }];
    this.guardandoMasivo = false;
    this.masivoModalOpen = true;
  }

  cerrarModalMasivo(): void {
    this.masivoModalOpen = false;
    this.masivoFilas = [];
    this.guardandoMasivo = false;
  }

  onMasivoOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModalMasivo();
    }
  }

  agregarFilaMasivo(): void {
    this.masivoFilas = [...this.masivoFilas, { nombre: '', inicioProgramado: '', finProgramado: '' }];
  }

  eliminarFilaMasivo(i: number): void {
    if (this.masivoFilas.length <= 1) return;
    this.masivoFilas = this.masivoFilas.filter((_, idx) => idx !== i);
  }

  guardarMasivo(): void {
    const invalida = this.masivoFilas.find(f => !f.nombre.trim());
    if (invalida !== undefined) {
      Swal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'Cada actividad debe tener un nombre.', confirmButtonColor: '#1E3A5F' });
      return;
    }
    const fechaInvalida = this.masivoFilas.find(
      f => f.inicioProgramado && f.finProgramado && f.inicioProgramado > f.finProgramado,
    );
    if (fechaInvalida) {
      Swal.fire({ icon: 'warning', title: 'Fechas inválidas', text: `En "${fechaInvalida.nombre}" el inicio es posterior al fin.`, confirmButtonColor: '#1E3A5F' });
      return;
    }

    this.guardandoMasivo = true;
    this.loaderService.show();
    this.service
      .crearActividadesMasivo(this.selectedProyectoId!, {
        actividades: this.masivoFilas.map(f => ({
          nombre: f.nombre.trim(),
          inicioProgramado: f.inicioProgramado || null,
          finProgramado: f.finProgramado || null,
          tipoCronograma: this.tipoCronogramaActivo!,
        })),
      })
      .subscribe({
        next: (res: CrearActividadesMasivoResultDto) => {
          this.guardandoMasivo = false;
          this.loaderService.hide();
          this.cerrarModalMasivo();
          this.recargar();
          const n = res.actividadesCreadas;
          Swal.fire({
            icon: 'success',
            title: `${n} actividad${n !== 1 ? 'es' : ''} creada${n !== 1 ? 's' : ''}`,
            confirmButtonColor: '#1E3A5F',
          });
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoMasivo = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  // ── Plantilla estándar ─────────────────────────────────────────────────────

  usarPlantilla(): void {
    if (!this.selectedProyectoId || !this.tipoCronogramaActivo) return;
    const esAnteproyecto = this.tipoCronogramaActivo === 'ANTEPROYECTO';
    Swal.fire({
      icon: 'question',
      title: esAnteproyecto
        ? '¿Cargar la plantilla estándar de Anteproyecto?'
        : '¿Cargar la plantilla estándar de Proyecto?',
      text: esAnteproyecto ? 'Se crearán 72 actividades.' : 'Se crearán 61 actividades.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cargar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2596be',
      cancelButtonColor: '#9ca3af',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.loadingActividades = true;
      this.loaderService.show();
      this.service
        .aplicarPlantilla(this.selectedProyectoId!, { tipoCronograma: this.tipoCronogramaActivo! })
        .subscribe({
          next: (res: AplicarPlantillaResultDto) => {
            this.recargar();
            const n = res.actividadesCreadas;
            Swal.fire({
              icon: 'success',
              title: `${n} actividad${n !== 1 ? 'es' : ''} creada${n !== 1 ? 's' : ''}`,
              confirmButtonColor: '#1E3A5F',
            });
          },
          error: (err: HttpErrorResponse) => {
            this.loadingActividades = false;
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  abrirModalEditar(act: ActividadDto): void {
    this.modalMode = 'editar';
    this.editandoId = act.projectActivityId;
    this.editandoAct = act;
    this.formActividad = act.activityDescription;
    this.formPlannedStart = act.plannedStartDate?.slice(0, 10) ?? '';
    this.formPlannedEnd = act.plannedEndDate?.slice(0, 10) ?? '';
    this.formActualEnd = act.actualEndDate?.slice(0, 10) ?? '';
    const raw = act.progressPercentage ?? 0;
    this.formProgress = raw >= 75 ? 100 : raw >= 25 ? 50 : 0;
    this.formPredecesoras = [...(act.predecesoras ?? [])];
    this.predSearch = '';
    this.predDropdownIdx = -1;
    this.guardando = false;
    this.modalOpen = true;
  }

  cerrarModal(): void {
    this.modalOpen = false;
    this.guardando = false;
    this.editandoAct = null;
    this.errorFechaReal = false;
    this.formPredecesoras = [];
    this.predSearch = '';
    this.predDropdownIdx = -1;
    this.nuevaDuracionDias = null;
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModal();
    }
  }

  // ── Cascada ────────────────────────────────────────────────────────────────

  private patchActividadLocal(res: ActividadDto): void {
    const idx = this.actividades.findIndex((a) => a.projectActivityId === res.projectActivityId);
    if (idx === -1) return;
    this.actividades[idx].activityDescription = res.activityDescription;
    this.actividades[idx].plannedStartDate    = res.plannedStartDate;
    this.actividades[idx].plannedEndDate      = res.plannedEndDate;
    this.actividades[idx].actualEndDate       = res.actualEndDate;
    this.actividades[idx].progressPercentage  = res.progressPercentage;
    this.actividades[idx].predecesoras        = res.predecesoras;
    this.actividades[idx].baselineStartDate   = res.baselineStartDate;
    this.actividades[idx].baselineEndDate     = res.baselineEndDate;
  }

  private patchPadresActualizados(padres: ActividadDto[]): void {
    for (const padre of padres) {
      const idx = this.actividades.findIndex((a) => a.projectActivityId === padre.projectActivityId);
      if (idx !== -1) {
        this.actividades[idx].plannedStartDate = padre.plannedStartDate;
        this.actividades[idx].plannedEndDate   = padre.plannedEndDate;
      }
    }
    this.buildAvanceMap();
    this.buildColorMap();
  }

  /**
   * El PUT de editar actividad ya aplica y persiste la cascada en backend
   * (ver EditarActividadAsync); res.cascada.cambios trae las fechas post-cascada
   * reales. Se parchea la tabla local desde ahí — no depender de la llamada
   * a recalcular-cascada/aplicar, que recalcula sobre datos ya aplicados y
   * por lo tanto siempre devuelve cambios vacíos.
   */
  private patchCascadaCambios(cambios: CascadaCambioDto[]): void {
    for (const c of cambios) {
      const idx = this.actividades.findIndex((a) => a.projectActivityId === c.projectActivityId);
      if (idx !== -1) {
        this.actividades[idx].plannedStartDate  = c.inicioNuevo;
        this.actividades[idx].plannedEndDate    = c.finNuevo;
        this.actividades[idx].baselineStartDate = c.baselineStartDate;
        this.actividades[idx].baselineEndDate   = c.baselineEndDate;
      }
    }
    // Desfase y semáforo (getDesfaseDias / getSemaforoClass) leen planned/baseline
    // directo de la fila en cada render — no requieren recálculo aparte.
    this.buildAvanceMap();
    this.buildColorMap();
  }

  private mostrarCascadaSiHayCambios(preview: CascadaResultDto): void {
    if (preview.hayCambios) {
      this.cascadaPreview = preview;
      this.cascadaModalOpen = true;
    }
  }

  aplicarCascada(): void {
    this.aplicandoCascada = true;
    this.loaderService.show();
    this.service.aplicarCascada(this.selectedProyectoId!).subscribe({
      next: (result) => {
        this.patchCascadaCambios(result.cambios);
        this.aplicandoCascada = false;
        this.cascadaModalOpen = false;
        this.cascadaPreview = null;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.aplicandoCascada = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  cancelarCascada(): void {
    this.cascadaModalOpen = false;
    this.cascadaPreview = null;
  }

  // ── Predecesoras ───────────────────────────────────────────────────────────

  private getDescendantIds(actId: number): Set<number> {
    const result = new Set<number>();
    const queue = [actId];
    while (queue.length) {
      const id = queue.shift()!;
      for (const a of this.actividades) {
        if (a.parentId === id) {
          result.add(a.projectActivityId);
          queue.push(a.projectActivityId);
        }
      }
    }
    return result;
  }

  filtrarPredecesoras(): PredResultItem[] {
    if (!this.editandoAct || !this.predSearch.trim()) return [];

    const term     = this.predSearch.trim();
    const isNum    = /^\d+$/.test(term);
    const termLow  = term.toLowerCase();
    const editId   = this.editandoAct.projectActivityId;
    const descIds  = this.getDescendantIds(editId);
    const selected = new Set(this.formPredecesoras);

    // Pool: excluir la actividad en edición y las ya agregadas como chips
    const pool = this.actividades.filter(
      (a) => a.projectActivityId !== editId && !selected.has(a.projectActivityId),
    );

    let matched: ActividadDto[];
    if (isNum) {
      // Coincidencia EXACTA por número de fila
      matched = pool.filter((a) => String(this.getDisplayIndex(a)) === term);
      // Fallback a búsqueda por nombre si no hay coincidencia exacta
      if (matched.length === 0) {
        matched = pool.filter((a) => a.activityDescription.toLowerCase().includes(termLow));
      }
    } else {
      matched = pool.filter(
        (a) =>
          String(this.getDisplayIndex(a)).includes(termLow) ||
          a.activityDescription.toLowerCase().includes(termLow),
      );
    }

    // Anotar con disabled/hint según el motivo de exclusión
    const result: PredResultItem[] = matched.map((a) => {
      if (descIds.has(a.projectActivityId))            return { act: a, disabled: true, hint: 'Es descendiente' };
      if (this.wouldCreateCycle(a.projectActivityId))  return { act: a, disabled: true, hint: 'Crearía un ciclo' };
      return { act: a, disabled: false, hint: '' };
    });

    // Habilitados primero; máximo 8 items
    result.sort((x, y) => Number(x.disabled) - Number(y.disabled));
    return result.slice(0, 8);
  }

  private wouldCreateCycle(candidateId: number): boolean {
    const editId  = this.editandoAct!.projectActivityId;
    const visited = new Set<number>();
    const queue   = [candidateId];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const act = this.actividades.find((a) => a.projectActivityId === id);
      for (const predId of act?.predecesoras ?? []) {
        if (predId === editId) return true;
        if (!visited.has(predId)) queue.push(predId);
      }
    }
    return false;
  }

  getPredChipLabel(pid: number): string {
    const act = this.actividades.find((a) => a.projectActivityId === pid);
    return act ? `${this.getDisplayIndex(act)} — ${act.activityDescription}` : `#${pid}`;
  }

  agregarPredecesora(act: ActividadDto): void {
    if (!this.formPredecesoras.includes(act.projectActivityId)) {
      this.formPredecesoras = [...this.formPredecesoras, act.projectActivityId];
    }
    this.predSearch = '';
    this.predDropdownIdx = -1;
    setTimeout(() => this.predInputRef?.nativeElement.focus(), 0);
  }

  onPredKeydown(event: KeyboardEvent): void {
    const results = this.filtrarPredecesoras();

    switch (event.key) {
      case 'ArrowDown': {
        if (!results.length) return;
        event.preventDefault();
        let next = this.predDropdownIdx + 1;
        while (next < results.length && results[next].disabled) next++;
        if (next < results.length) {
          this.predDropdownIdx = next;
          this.cdr.detectChanges();
          document.querySelector('.pred-result-active')?.scrollIntoView({ block: 'nearest' });
        }
        break;
      }
      case 'ArrowUp': {
        if (!results.length) return;
        event.preventDefault();
        let prev = this.predDropdownIdx - 1;
        while (prev >= 0 && results[prev].disabled) prev--;
        if (prev >= 0) {
          this.predDropdownIdx = prev;
          this.cdr.detectChanges();
          document.querySelector('.pred-result-active')?.scrollIntoView({ block: 'nearest' });
        }
        break;
      }
      case 'Enter': {
        if (this.predDropdownIdx >= 0 && this.predDropdownIdx < results.length) {
          const item = results[this.predDropdownIdx];
          if (!item.disabled) { event.preventDefault(); this.agregarPredecesora(item.act); }
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.predSearch = '';
        this.predDropdownIdx = -1;
        break;
    }
  }

  quitarPredecesora(id: number): void {
    this.formPredecesoras = this.formPredecesoras.filter((p) => p !== id);
  }

  getPredTooltip(act: ActividadDto): string {
    if (!act.predecesoras?.length) return '';
    const nombres = act.predecesoras.map((pid) => {
      const pred = this.actividades.find((a) => a.projectActivityId === pid);
      return pred ? `${this.getDisplayIndex(pred)}. ${pred.activityDescription}` : `#${pid}`;
    });
    return `Predecesoras: ${nombres.join(', ')}`;
  }

  getPredecessorasLabel(act: ActividadDto): string {
    if (!act.predecesoras?.length) return '';
    const MAX = 2;
    const nums = act.predecesoras.map((p) => {
      const found = this.actividades.find((a) => a.projectActivityId === p);
      return found ? this.getDisplayIndex(found) : '?';
    });
    if (nums.length <= MAX) return '← ' + nums.join(', ');
    return '← ' + nums.slice(0, MAX).join(', ') + ' +' + (nums.length - MAX);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  onProgressChange(val: number): void {
    this.formProgress = val;
    if (val !== 100) this.errorFechaReal = false;
  }

  guardar(): void {
    if (!this.selectedProyectoId) return;
    if (!this.formActividad.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El nombre de la actividad es obligatorio.',
        confirmButtonColor: '#2596be',
      });
      return;
    }
    if (this.modalMode === 'editar' && this.formProgress === 100 && !this.formActualEnd) {
      this.errorFechaReal = true;
      return;
    }
    if (this.modalMode === 'crear' && this.formNivel > 1 && !this.formPadreId) {
      Swal.fire({
        icon: 'warning',
        title: 'Padre requerido',
        text: 'Debes seleccionar un padre para esta actividad.',
        confirmButtonColor: '#2596be',
      });
      return;
    }
    this.errorFechaReal = false;
    this.guardando = true;

    if (this.modalMode === 'crear') {
      const body: CrearActividadRequest = {
        activityDescription: this.formActividad.trim(),
        plannedStartDate: this.formPlannedStart || null,
        plannedEndDate: this.formPlannedEnd || null,
        progressPercentage: Number(this.formProgress) || 0,
        hierarchyLevel: this.formNivel,
        parentId: this.formNivel > 1 ? this.formPadreId : null,
        tipoCronograma: this.tipoCronogramaActivo!,
      };
      this.service.crearActividad(this.selectedProyectoId, body).subscribe({
        next: (res: EditarActividadResultDto) => {
          if (res.padresActualizados?.length) this.patchPadresActualizados(res.padresActualizados);
          this.cerrarModal();
          this.recargar();
        },
        error: (err: HttpErrorResponse) => { this.guardando = false; this.errorService.handleError(err); },
      });
    } else {
      const actividadId  = this.editandoId!;
      const predSnapshot = [...this.formPredecesoras];

      const predCambiaron =
        JSON.stringify([...predSnapshot].sort()) !==
        JSON.stringify([...(this.editandoAct?.predecesoras ?? [])].sort());

      const body: EditarActividadRequest = {
        activityDescription: this.formActividad.trim(),
        plannedStartDate:    this.formPlannedStart || null,
        plannedEndDate:      this.formPlannedEnd   || null,
        actualEndDate:       this.formActualEnd    || null,
        progressPercentage:  Number(this.formProgress) || 0,
        predecessorIds:      predCambiaron ? predSnapshot : null,
      };

      this.service.editarActividad(actividadId, body).subscribe({
        next: (res: EditarActividadResultDto) => {
          this.patchActividadLocal(res.actividad);
          if (res.padresActualizados?.length) {
            this.patchPadresActualizados(res.padresActualizados);
          } else {
            this.buildAvanceMap();
          }
          if (res.cascada?.cambios?.length) {
            this.patchCascadaCambios(res.cascada.cambios);
          }
          this.guardando = false;
          this.cerrarModal();
          this.cdr.detectChanges();

          if (res.cascada) {
            this.mostrarCascadaSiHayCambios(res.cascada);
            this.cdr.detectChanges();
          }
        },
        error: (err: HttpErrorResponse) => { this.guardando = false; this.errorService.handleError(err); },
      });
    }
  }

  culminarDesdeModal(): void {
    if (!this.editandoAct) return;
    const act = this.editandoAct;
    this.service.culminarActividad(act.projectActivityId).subscribe({
      next: (res) => {
        const idx = this.actividades.findIndex((a) => a.projectActivityId === act.projectActivityId);
        if (idx !== -1) this.actividades[idx].actualEndDate = res.actualEndDate;
        this.buildAvanceMap();
        this.cerrarModal();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  eliminarDesdeModal(): void {
    if (!this.editandoAct) return;
    const act = this.editandoAct;
    Swal.fire({
      title: '¿Eliminar actividad?',
      text: act.activityDescription,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.service.eliminarActividad(act.projectActivityId).subscribe({
        next: () => {
          this.actividades = this.actividades.filter(
            (a) => a.projectActivityId !== act.projectActivityId,
          );
          this.buildParentIds();
          this.buildColorMap();
          this.buildAvanceMap();
          this.cerrarModal();
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  private recargar(): void {
    if (this.selectedProyectoId && this.tipoCronogramaActivo) {
      this.loadActividades(this.selectedProyectoId);
    }
  }

  /** Recarga desde BD preservando scroll (.page-content) y estado de colapso. */
  private recargarConEstado(): void {
    if (!this.selectedProyectoId) return;

    const scrollEl = document.querySelector('.page-content') as HTMLElement | null;
    const scrollTop = scrollEl?.scrollTop ?? 0;
    const colapsados = new Set(this.collapsedIds);

    this.loadingActividades = true;
    this.loaderService.show();
    this.service.getActividades(this.selectedProyectoId, this.tipoCronogramaActivo!).subscribe({
      next: (res: ActividadesProyectoResponseDto) => {
        this.proyectoHeader = res.proyecto;
        this.actividades    = res.actividades ?? [];
        this.buildParentIds();
        this.buildColorMap();
        this.buildAvanceMap();

        // Restaurar colapso antes del render: solo IDs que siguen existiendo
        const existentes = new Set(this.actividades.map((a) => a.projectActivityId));
        this.collapsedIds = new Set([...colapsados].filter((id) => existentes.has(id)));

        this.loadingActividades = false;
        this.loaderService.hide();
        this.cdr.detectChanges();

        // Restaurar scroll en el siguiente tick, cuando el DOM ya está actualizado
        setTimeout(() => { if (scrollEl) scrollEl.scrollTop = scrollTop; }, 0);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingActividades = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Línea base toggle ─────────────────────────────────────────────────────

  toggleLineaBase(): void {
    this.lineaBaseVisible = !this.lineaBaseVisible;
  }

  // ── Edición inline de fechas ───────────────────────────────────────────────

  get inlinePopoverStyle(): Record<string, string> {
    return { top: `${this.inlinePopoverPos.top}px`, left: `${this.inlinePopoverPos.left}px` };
  }

  getInlineFieldLabel(): string {
    switch (this.inlineEditCell?.field) {
      case 'start':   return 'Inicio Programado';
      case 'end':     return 'Fin Programado';
      case 'lbStart': return 'LB Inicio';
      case 'lbEnd':   return 'LB Fin';
      default:        return '';
    }
  }

  startInlineEdit(
    act: ActividadDto,
    field: 'start' | 'end' | 'lbStart' | 'lbEnd',
    event: MouseEvent,
  ): void {
    if (act.esPadre) return;
    event.stopPropagation();

    // Calcular posición del popover desde la celda clicada
    const cell = (event.target as HTMLElement).closest('td') as HTMLElement;
    const rect  = cell?.getBoundingClientRect() ?? { top: 0, bottom: 0, left: 0, right: 0 };
    const vpW   = window.innerWidth;
    const vpH   = window.innerHeight;
    const popW  = 240;
    const popH  = 130;
    const left  = rect.right + popW > vpW - 8  ? rect.right - popW : rect.left;
    const top   = rect.bottom + popH > vpH - 8 ? rect.top - popH - 4 : rect.bottom + 4;
    this.inlinePopoverPos = { top, left };

    const val =
      field === 'start'   ? act.plannedStartDate :
      field === 'end'     ? act.plannedEndDate :
      field === 'lbStart' ? act.baselineStartDate :
                            act.baselineEndDate;
    this.inlineEditValue = val?.slice(0, 10) ?? '';
    this.inlineEditCell  = { id: act.projectActivityId, field };
    this.cdr.detectChanges();
    setTimeout(() => this.popoverDateInputRef?.nativeElement.focus(), 0);
  }

  cancelInlineEdit(): void {
    this.inlineEditCell = null;
    this.cdr.detectChanges();
  }

  commitInlineEdit(): void {
    const nativeVal = this.popoverDateInputRef?.nativeElement?.value;
    if (!this.inlineEditCell || this.inlineEditInFlight) return;
    this.inlineEditInFlight = true;

    const value = nativeVal ?? this.inlineEditValue;
    const cell  = this.inlineEditCell;
    this.inlineEditCell = null;
    this.cdr.detectChanges();

    const act = this.actividades.find((a) => a.projectActivityId === cell.id);
    if (!act) { this.inlineEditInFlight = false; return; }

    if (cell.field === 'start' || cell.field === 'end') {
      const cur = (cell.field === 'start'
        ? act.plannedStartDate : act.plannedEndDate)?.slice(0, 10) ?? '';
      if ((value || '') === cur) { this.inlineEditInFlight = false; return; }

      const body: EditarActividadRequest = {
        activityDescription: act.activityDescription,
        plannedStartDate:    cell.field === 'start' ? (value || null) : act.plannedStartDate,
        plannedEndDate:      cell.field === 'end'   ? (value || null) : act.plannedEndDate,
        actualEndDate:       act.actualEndDate,
        progressPercentage:  act.progressPercentage,
      };

      this.service.editarActividad(act.projectActivityId, body).subscribe({
        next: (res: EditarActividadResultDto) => {
          this.patchActividadLocal(res.actividad);
          if (res.padresActualizados?.length) {
            this.patchPadresActualizados(res.padresActualizados);
          } else {
            this.buildAvanceMap();
            this.buildColorMap();
          }
          if (res.cascada?.cambios?.length) {
            this.patchCascadaCambios(res.cascada.cambios);
          }
          this.inlineEditInFlight = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.inlineEditInFlight = false;
          this.errorService.handleError(err);
        },
      });
    } else {
      // Edición de línea base
      const hasLb = !!(act.baselineStartDate || act.baselineEndDate);
      const actId = act.projectActivityId;
      const lbBody = {
        baselineStartDate: cell.field === 'lbStart' ? (value || null) : (act.baselineStartDate ?? null),
        baselineEndDate:   cell.field === 'lbEnd'   ? (value || null) : (act.baselineEndDate   ?? null),
      };

      const doSave = () => {
        this.service.actualizarLineaBase(actId, lbBody).subscribe({
          next: () => {
            const idx = this.actividades.findIndex((a) => a.projectActivityId === actId);
            if (idx !== -1) {
              if (cell.field === 'lbStart') this.actividades[idx].baselineStartDate = value || null;
              else                          this.actividades[idx].baselineEndDate   = value || null;
            }
            this.inlineEditInFlight = false;
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => {
            this.inlineEditInFlight = false;
            this.errorService.handleError(err);
          },
        });
      };

      if (hasLb) {
        Swal.fire({
          icon: 'warning',
          title: '¿Cambiar línea base?',
          text: '¿Seguro que quieres cambiar la línea base? Esta acción modifica tu referencia de comparación.',
          showCancelButton: true,
          confirmButtonText: 'Sí, cambiar',
          cancelButtonText:  'Cancelar',
          confirmButtonColor: '#2596be',
          cancelButtonColor:  '#9ca3af',
        }).then((result) => {
          if (result.isConfirmed) doSave();
          else this.inlineEditInFlight = false;
        });
      } else {
        doSave();
      }
    }
  }

  // ── Desfase y semáforo ─────────────────────────────────────────────────────

  getDesfaseDias(act: ActividadDto, field: 'start' | 'end'): number | null {
    if (act.esPadre) {
      const hijos = this.actividades.filter((a) => a.parentId === act.projectActivityId);
      const vals  = hijos
        .map((h) => this.getDesfaseDias(h, field))
        .filter((d): d is number => d !== null);
      return vals.length ? Math.round(vals.reduce((s, d) => s + d, 0) / vals.length) : null;
    }
    const lb   = (field === 'start' ? act.baselineStartDate : act.baselineEndDate)?.slice(0, 10);
    const prog = (field === 'start' ? act.plannedStartDate  : act.plannedEndDate)?.slice(0, 10);
    if (!lb || !prog) return null;
    return Math.round((new Date(prog).getTime() - new Date(lb).getTime()) / 86400000);
  }

  formatDesfase(dias: number | null): string {
    if (dias === null) return '—';
    if (dias > 0) return `+${dias}d`;
    if (dias < 0) return `${dias}d`;
    return '0d';
  }

  getDesfaseClass(dias: number | null): string {
    if (dias === null) return '';
    if (dias <= 0) return 'desfase-ok';
    if (dias <= 7) return 'desfase-warn';
    return 'desfase-late';
  }

  getSemaforoClass(act: ActividadDto): string {
    if (act.esPadre) {
      const hijos  = this.actividades.filter((a) => a.parentId === act.projectActivityId);
      const clases = hijos.map((h) => this.getSemaforoClass(h));
      if (clases.includes('semaforo-rojo'))     return 'semaforo-rojo';
      if (clases.includes('semaforo-amarillo')) return 'semaforo-amarillo';
      if (clases.length && clases.every((s) => s === 'semaforo-verde')) return 'semaforo-verde';
      return 'semaforo-gris';
    }
    const d = this.getDesfaseDias(act, 'end');
    if (d === null) return 'semaforo-gris';
    if (d <= 0)  return 'semaforo-verde';
    if (d <= 7)  return 'semaforo-amarillo';
    return 'semaforo-rojo';
  }

  // ── Duración ───────────────────────────────────────────────────────────────

  getDuracion(act: ActividadDto): string {
    if (!act.plannedStartDate || !act.plannedEndDate) return '—';
    const days = Math.round(
      (new Date(act.plannedEndDate).getTime() - new Date(act.plannedStartDate).getTime()) / 86400000,
    );
    return days >= 0 ? `${days}d` : '—';
  }

  onNuevaDuracionChange(dias: number | null): void {
    this.nuevaDuracionDias = dias;
    if (!this.formPlannedStart || !dias || dias < 1) return;
    const start = new Date(this.formPlannedStart);
    start.setDate(start.getDate() + dias);
    this.formPlannedEnd = start.toISOString().slice(0, 10);
  }

  onFormPlannedEndChange(val: string): void {
    this.formPlannedEnd = val;
    if (this.modalMode !== 'crear' || !this.formPlannedStart || !val) {
      if (this.modalMode === 'crear') this.nuevaDuracionDias = null;
      return;
    }
    const days = Math.round(
      (new Date(val).getTime() - new Date(this.formPlannedStart).getTime()) / 86400000,
    );
    this.nuevaDuracionDias = days >= 0 ? days : null;
  }

  // ── Export PDF ─────────────────────────────────────────────────────────────

  getSemaforoTexto(act: ActividadDto): string {
    const cls = this.getSemaforoClass(act);
    if (cls === 'semaforo-verde')    return 'Verde';
    if (cls === 'semaforo-amarillo') return 'Amarillo';
    if (cls === 'semaforo-rojo')     return 'Rojo';
    return '—';
  }

  // ── Vista Gantt dhtmlx ─────────────────────────────────────────────────────

  toggleVistaGantt(): void {
    if (!this.vistaGantt) {
      this.vistaGantt = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.initGanttView();
        this.renderGanttActividades();
        setTimeout(() => this.drawGanttTodayLine(), 50);
      }, 0);
    } else {
      this.destroyGanttView();
      this.vistaGantt = false;
      this.cdr.detectChanges();
    }
  }

  private initGanttView(): void {
    if (!this.ganttContainerRef) return;

    gantt.clearAll();
    (gantt.config as any).csp = false;
    gantt.config.readonly = true;
    (gantt.config as any).drag_move = false;
    (gantt.config as any).drag_resize = false;
    (gantt.config as any).drag_progress = false;
    gantt.config.show_links = false;
    gantt.config.row_height = 28;
    gantt.config.bar_height = 16;
    gantt.config.scale_height = 44;
    (gantt.config as any).fit_tasks = true;
    gantt.config.grid_width = 680;
    (gantt.config as any).scroll_size = 8;

    gantt.config.scales = [
      { unit: 'month', step: 1, format: '%F %Y' },
      { unit: 'week', step: 1, format: 'Sem %W' },
    ];

    gantt.config.columns = [
      { name: 'text', label: 'Actividad', tree: true, width: 500, min_width: 500 },
      { name: 'start_date', label: 'Inicio Programado', align: 'center', width: 90,
        template: (task: any) => gantt.date.date_to_str('%d/%m/%y')(task.start_date) },
      { name: 'end_date', label: 'Fin Programado', align: 'center', width: 90,
        template: (task: any) => gantt.date.date_to_str('%d/%m/%y')(task.end_date) },
    ];

    gantt.templates.task_class = (_s: any, _e: any, task: any) =>
      `gantt-cron-lvl-${Math.min(task['hierarchyLevel'] ?? 0, 3)}`;

    gantt.templates.task_text = () => '';

    gantt.templates.grid_row_class = (_s: any, _e: any, task: any) =>
      `gantt-cron-row-lvl-${Math.min(task['hierarchyLevel'] ?? 0, 3)}`;

    gantt.templates.tooltip_text = (start: Date, end: Date, task: any) => {
      const fmt = gantt.date.date_to_str('%d/%m/%Y');
      return `<b>${task.text}</b><br/>Inicio: ${fmt(start)}<br/>Fin: ${fmt(end)}<br/>Avance: ${task['avance']}%`;
    };

    gantt.init(this.ganttContainerRef.nativeElement);
  }

  private renderGanttActividades(): void {
    const hoy = new Date();
    const tasks = this.actividades.map((act) => {
      const info = this.rowStyleMap.get(act.projectActivityId);
      const barColor = info?.color ?? '#415a77';
      const barTextColor = info?.color ? this.getBranchTextColor(info.color) : '#ffffff';

      let start: Date;
      let end: Date;
      if (!act.plannedStartDate) {
        start = new Date(hoy);
        end = new Date(hoy.getTime() + 86_400_000);
      } else {
        start = new Date(act.plannedStartDate);
        end = act.plannedEndDate
          ? new Date(act.plannedEndDate)
          : new Date(new Date(act.plannedStartDate).getTime() + 86_400_000);
      }

      return {
        id: act.projectActivityId,
        text: act.activityDescription,
        start_date: start,
        end_date: end,
        parent: act.parentId ?? 0,
        open: true,
        color: barColor,
        textColor: barTextColor,
        hierarchyLevel: act.hierarchyLevel,
        avance: this.getAvance(act),
        orden: act.order,
        duracion: this.getDuracion(act),
        desfaseIni: this.formatDesfase(this.getDesfaseDias(act, 'start')),
        desfaseFin: this.formatDesfase(this.getDesfaseDias(act, 'end')),
        semaforo: this.getSemaforoTexto(act),
        finReal: this.formatDate(act.actualEndDate),
      };
    });

    gantt.parse({ data: tasks, links: [] });

    const firstDate = this.actividades
      .map((a) => (a.plannedStartDate ? new Date(a.plannedStartDate) : null))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (firstDate) gantt.showDate(firstDate);
  }

  private drawGanttTodayLine(): void {
    if (!this.ganttContainerRef) return;
    const el: HTMLElement = this.ganttContainerRef.nativeElement;
    const existing = el.querySelector('#today-line-custom');
    if (existing) existing.remove();

    const state = gantt.getState();
    if (!state.min_date || !state.max_date) return;

    const totalMs = state.max_date.getTime() - state.min_date.getTime();
    if (totalMs <= 0) return;

    const nowMs = new Date().getTime() - state.min_date.getTime();
    if (nowMs <= 0 || nowMs >= totalMs) return;

    const pct = (nowMs / totalMs) * 100;
    const dataArea = el.querySelector('.gantt_data_area') as HTMLElement | null;
    if (!dataArea) return;

    const line = document.createElement('div');
    line.id = 'today-line-custom';
    line.style.cssText = [
      'position:absolute',
      'top:0',
      'bottom:0',
      `left:${pct}%`,
      'width:2px',
      'background:#f59e0b',
      'opacity:0.85',
      'pointer-events:none',
      'z-index:10',
    ].join(';');
    dataArea.appendChild(line);
  }

  private destroyGanttView(): void {
    if (this.ganttContainerRef) {
      const el: HTMLElement = this.ganttContainerRef.nativeElement;
      const line = el.querySelector('#today-line-custom');
      if (line) line.remove();
    }
    gantt.clearAll();
  }

  // ── Modal Importar MPP ─────────────────────────────────────────────────────

  abrirModalMpp(): void {
    this.mppFile = null;
    this.importando = false;
    this.mppModalOpen = true;
  }

  cerrarModalMpp(): void {
    this.mppModalOpen = false;
    this.mppFile = null;
    this.importando = false;
  }

  onMppOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarModalMpp();
    }
  }

  onMppFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.mppFile = input.files?.[0] ?? null;
  }

  importarMpp(): void {
    if (!this.selectedProyectoId || !this.mppFile) return;

    const doImport = () => {
      this.importando = true;
      this.service.importarMpp(this.selectedProyectoId!, this.mppFile!, this.tipoCronogramaActivo!).subscribe({
        next: (r: ImportarMppResultDto) => {
          this.importando = false;
          this.cerrarModalMpp();
          this.recargar();
          const texto =
            r.actividadesManualesConservadas > 0
              ? `Se importaron ${r.actividadesImportadas} actividades. ${r.actividadesManualesConservadas} actividades manuales fueron conservadas al final del cronograma.`
              : `Se importaron ${r.actividadesImportadas} actividades correctamente.`;
          Swal.fire({ icon: 'success', title: 'Importación exitosa', text: texto, confirmButtonColor: '#2596be' });
        },
        error: (err: HttpErrorResponse) => {
          this.importando = false;
          this.errorService.handleError(err);
        },
      });
    };

    if (this.actividades.length > 0) {
      const manualesCount = this.actividades.filter((a) => a.isManual).length;
      const texto =
        manualesCount > 0
          ? `Se reemplazarán las actividades importadas desde MS Project. Las ${manualesCount} actividades creadas manualmente se conservarán al final del cronograma.`
          : `Se reemplazarán todas las actividades del cronograma con las del archivo MPP.`;
      Swal.fire({
        icon: 'warning',
        title: '¿Estás seguro?',
        text: texto,
        showCancelButton: true,
        confirmButtonText: 'Sí, importar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2596be',
        cancelButtonColor: '#9ca3af',
      }).then((result) => {
        if (result.isConfirmed) doImport();
      });
    } else {
      doImport();
    }
  }

  /** Paleta BCS para el borde de jerarquía del PDF: nivel 0, nivel 1 (una por rama) y su derivado (nivel 2+). */
  private readonly PDF_NIVEL0_RGB: [number, number, number] = [13, 27, 42]; // #0D1B2A
  private readonly PDF_NIVEL1_RGB: [number, number, number][] = [
    [27, 38, 59],    // #1B263B
    [65, 90, 119],   // #415A77
    [119, 141, 169], // #778DA9
    [224, 225, 221], // #E0E1DD
  ];
  private readonly PDF_NIVEL2_RGB: [number, number, number][] = [
    [44, 62, 86],    // #2C3E56 — deriva de #1B263B
    [85, 112, 144],  // #557090 — deriva de #415A77
    [143, 163, 184], // #8FA3B8 — deriva de #778DA9
    [202, 203, 199], // #CACBC7 — deriva de #E0E1DD
  ];

  /** Un color de borde por actividad, según su nivel de jerarquía (paleta BCS). */
  private buildPdfNivelColorMap(): Map<number, [number, number, number]> {
    const map = new Map<number, [number, number, number]>();
    const nivel1Idx = new Map<number, number>();
    let cursor = 0;

    for (const act of this.actividades) {
      const level = act.hierarchyLevel ?? 0;
      if (level <= 0 && act.parentId == null) {
        map.set(act.projectActivityId, this.PDF_NIVEL0_RGB);
      } else if (level === 1) {
        const idx = cursor % this.PDF_NIVEL1_RGB.length;
        cursor++;
        nivel1Idx.set(act.projectActivityId, idx);
        map.set(act.projectActivityId, this.PDF_NIVEL1_RGB[idx]);
      } else {
        const idx = this.findPdfNivel1AncestorIdx(act, nivel1Idx);
        map.set(act.projectActivityId, idx !== null ? this.PDF_NIVEL2_RGB[idx] : this.PDF_NIVEL0_RGB);
      }
    }
    return map;
  }

  private findPdfNivel1AncestorIdx(act: ActividadDto, nivel1Idx: Map<number, number>): number | null {
    let current: ActividadDto | undefined = act;
    while (current && current.parentId !== null) {
      const parent = this.actividades.find((a) => a.projectActivityId === current!.parentId);
      if (!parent) return null;
      if (nivel1Idx.has(parent.projectActivityId)) return nivel1Idx.get(parent.projectActivityId)!;
      current = parent;
    }
    return null;
  }

  /** Regla de color por avance en el PDF: ≥75 verde, ≥50 azul, ≥25 naranja, <25 rojo. */
  private getPdfAvanceRgb(pct: number): [number, number, number] {
    if (pct >= 75) return [27, 107, 58];  // #1B6B3A
    if (pct >= 50) return [46, 109, 180]; // #2E6DB4
    if (pct >= 25) return [217, 119, 6];  // #D97706
    return [192, 57, 43];                 // #C0392B
  }

  private getPdfSemaforoRgb(cls: string): [number, number, number] {
    if (cls === 'semaforo-verde')    return [22, 163, 74];
    if (cls === 'semaforo-amarillo') return [245, 158, 11];
    if (cls === 'semaforo-rojo')     return [239, 68, 68];
    return [148, 163, 184]; // #94A3B8 — sin datos (sin predecesora/línea base)
  }

  /** Card de KPI estilo dashboard: fondo blanco, sin sombra, borde superior de acento. */
  private drawPdfKpiCard(
    doc: jsPDF,
    x: number, y: number, w: number, h: number,
    accent: [number, number, number],
    value: string,
    label: string,
  ): void {
    const radius = 2;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, w, h, radius, radius, 'FD');

    doc.setFillColor(...accent);
    doc.rect(x + radius, y, w - radius * 2, 1.3, 'F');

    doc.setTextColor(30, 58, 95); // #1E3A5F
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(value, x + w / 2, y + h / 2 + 2, { align: 'center' });

    doc.setTextColor(100, 116, 139); // #64748B
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(label, x + w / 2, y + h - 3.5, { align: 'center' });
  }

  exportarPdf(): void {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 10;
    const today = new Date();
    const dd    = String(today.getDate()).padStart(2, '0');
    const mm    = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy  = today.getFullYear();
    const fechaLabel = `${dd}/${mm}/${yyyy}`;
    const fechaFile  = `${yyyy}-${mm}-${dd}`;

    doc.setFillColor(27, 38, 59);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(224, 225, 221);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    const titulo = this.proyectoHeader?.projectDescription ?? 'Cronograma de Actividades';
    doc.text(titulo, marginX, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Exportado: ${fechaLabel}`, pageW - marginX, 11, { align: 'right' });

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const totalActividades = this.actividades.length;
    const raices = this.actividades.filter((a) => a.parentId === null);
    const avanceGeneral = raices.length
      ? Math.round(raices.reduce((s, a) => s + this.getAvance(a), 0) / raices.length)
      : 0;

    let countVerde = 0, countAmarillo = 0, countRojo = 0;
    for (const act of this.actividades) {
      const cls = this.getSemaforoClass(act);
      if (cls === 'semaforo-verde') countVerde++;
      else if (cls === 'semaforo-amarillo') countAmarillo++;
      else if (cls === 'semaforo-rojo') countRojo++;
    }

    const kpis: { value: string; label: string; accent: [number, number, number] }[] = [
      { value: String(totalActividades), label: 'Total actividades',    accent: [30, 58, 95] },
      { value: `${avanceGeneral}%`,       label: 'Avance general',       accent: this.getPdfAvanceRgb(avanceGeneral) },
      { value: String(countVerde),        label: 'En tiempo (verde)',    accent: [22, 163, 74] },
      { value: String(countAmarillo),     label: 'En riesgo (amarillo)', accent: [245, 158, 11] },
      { value: String(countRojo),         label: 'Atrasadas (rojo)',     accent: [239, 68, 68] },
    ];

    const kpiY     = 23;
    const kpiH     = 18;
    const kpiGap   = 4;
    const kpiAreaW = pageW - marginX * 2;
    const kpiW     = (kpiAreaW - kpiGap * (kpis.length - 1)) / kpis.length;
    kpis.forEach((kpi, i) => {
      const x = marginX + i * (kpiW + kpiGap);
      this.drawPdfKpiCard(doc, x, kpiY, kpiW, kpiH, kpi.accent, kpi.value, kpi.label);
    });

    const tableStartY = kpiY + kpiH + 6;

    // ── Tabla ────────────────────────────────────────────────────────────────
    const colsBase = [
      { header: '#',            dataKey: 'num'     },
      { header: 'Actividad',    dataKey: 'act'     },
      { header: 'Inicio Prog.', dataKey: 'ini'     },
      { header: 'Fin Prog.',    dataKey: 'fin'     },
      { header: 'Duración',     dataKey: 'dur'     },
      { header: 'Avance%',      dataKey: 'avance'  },
      { header: 'Estado',       dataKey: 'estado'  },
    ];
    const colsLb = [
      { header: 'LB Inicio',    dataKey: 'lbIni'   },
      { header: 'LB Fin',       dataKey: 'lbFin'   },
      { header: 'Desfase Ini.', dataKey: 'dsfIni'  },
      { header: 'Desfase Fin.', dataKey: 'dsfFin'  },
      { header: 'Semáforo',     dataKey: 'semaforo'},
    ];
    const columns = this.lineaBaseVisible ? [...colsBase, ...colsLb] : colsBase;

    const rows = this.actividades.map((act, i) => {
      const indent = '  '.repeat(act.hierarchyLevel ?? 0);
      const row: Record<string, string> = {
        num:    String(i + 1),
        act:    indent + act.activityDescription,
        ini:    this.formatDate(act.plannedStartDate),
        fin:    this.formatDate(act.plannedEndDate),
        dur:    this.getDuracion(act),
        avance: `${this.getAvance(act)}%`,
        estado: this.getEstado(act),
      };
      if (this.lineaBaseVisible) {
        row['lbIni']    = this.formatDate(act.baselineStartDate);
        row['lbFin']    = this.formatDate(act.baselineEndDate);
        row['dsfIni']   = this.formatDesfase(this.getDesfaseDias(act, 'start'));
        row['dsfFin']   = this.formatDesfase(this.getDesfaseDias(act, 'end'));
        row['semaforo'] = '';
      }
      return row;
    });

    const nivelColorMap = this.buildPdfNivelColorMap();

    autoTable(doc, {
      startY: tableStartY,
      columns,
      body: rows,
      theme: 'grid',
      styles:             { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', minCellHeight: 7 },
      headStyles:         { fillColor: [27, 38, 59], textColor: [224, 225, 221], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        num:      { cellWidth: 8,    halign: 'center' },
        act:      { cellWidth: 'auto' },
        ini:      { cellWidth: 22,   halign: 'center' },
        fin:      { cellWidth: 22,   halign: 'center' },
        dur:      { cellWidth: 18,   halign: 'center' },
        avance:   { cellWidth: 22,   halign: 'center' },
        estado:   { cellWidth: 22,   halign: 'center' },
        lbIni:    { cellWidth: 22,   halign: 'center' },
        lbFin:    { cellWidth: 22,   halign: 'center' },
        dsfIni:   { cellWidth: 20,   halign: 'center' },
        dsfFin:   { cellWidth: 20,   halign: 'center' },
        semaforo: { cellWidth: 20,   halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'estado') {
          const v = data.cell.raw as string;
          if (v === 'CULMINADA')   { data.cell.styles.textColor = [20, 83, 45];   data.cell.styles.fontStyle = 'bold'; }
          if (v === 'VENCIDO')     { data.cell.styles.textColor = [127, 29, 29];  data.cell.styles.fontStyle = 'bold'; }
          if (v === 'EN PROGRESO') { data.cell.styles.textColor = [30, 58, 95]; }
        }
      },
      didDrawCell: (data) => {
        if (data.section !== 'body') return;
        const act = this.actividades[data.row.index];
        if (!act) return;

        // Jerarquía visual: borde izquierdo de 3-4px con la paleta BCS (solo primera columna)
        if (data.column.index === 0) {
          const color = nivelColorMap.get(act.projectActivityId) ?? this.PDF_NIVEL0_RGB;
          doc.setFillColor(...color);
          doc.rect(data.cell.x, data.cell.y, 1.1, data.cell.height, 'F');
        }

        // Barra de progreso visual en Avance%
        if (data.column.dataKey === 'avance') {
          const pct      = this.getAvance(act);
          const sinDatos = !act.plannedStartDate && !act.plannedEndDate;
          const barX = data.cell.x + 2;
          const barW = data.cell.width - 4;
          const barY = data.cell.y + data.cell.height - 3;
          const barH = 1.6;

          doc.setFillColor(226, 232, 240); // #E2E8F0 — riel
          doc.roundedRect(barX, barY, barW, barH, 0.8, 0.8, 'F');

          if (!sinDatos && pct > 0) {
            const fillColor = this.getPdfAvanceRgb(pct);
            const fillW = Math.max((barW * Math.min(pct, 100)) / 100, 1.6);
            doc.setFillColor(...fillColor);
            doc.roundedRect(barX, barY, fillW, barH, 0.8, 0.8, 'F');
          }
        }

        // Semáforo como círculo de color (igual que en pantalla)
        if (data.column.dataKey === 'semaforo') {
          const rgb = this.getPdfSemaforoRgb(this.getSemaforoClass(act));
          doc.setFillColor(...rgb);
          doc.circle(data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, 1.4, 'F');
        }
      },
    });

    const nombre = this.proyectoHeader?.projectDescription ?? 'cronograma';
    const safe   = nombre.replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ ]/g, '').trim().replace(/\s+/g, '_');
    doc.save(`${safe}_cronograma_${fechaFile}.pdf`);
  }
}
