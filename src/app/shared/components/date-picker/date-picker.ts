import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  anclaSigueVisible,
  bloqueContenedorFijo,
  contenedoresQueRecortan,
} from '../../utils/panel-flotante.util';

/** Una celda del calendario (puede pertenecer al mes vecino como relleno). */
interface DiaCelda {
  dia: number;
  mes: number; // 0-11
  anio: number;
  delMes: boolean;
}

/**
 * Selector de fecha con calendario desplegable, reemplazo estilizado del `<input type="date">`.
 * El valor se maneja como string `YYYY-MM-DD` (o null), igual que el input nativo, por lo que
 * es un reemplazo directo en los filtros/formularios existentes. La fecha también puede
 * escribirse a mano en formato `dd/mm/aaaa` (se valida al salir del campo o con Enter).
 */
@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.css',
})
export class DatePicker implements OnChanges, OnDestroy {
  @Input() label: string = '';
  @Input() showLabel: boolean = true;
  /** true = agrega un asterisco rojo al label para marcar el campo como obligatorio. */
  @Input() required: boolean = false;
  @Input() placeholder: string = 'dd/mm/aaaa';
  /** Fecha seleccionada en formato `YYYY-MM-DD`, o null/undefined si no hay selección. */
  @Input() value: string | null | undefined = null;
  @Output() valueChange = new EventEmitter<string | null>();
  @Input() allowClear: boolean = true;
  /** Deshabilita el campo: no se puede escribir, ni abrir el calendario, ni limpiar. */
  @Input() disabled: boolean = false;
  /**
   * Fecha mínima seleccionable en formato `YYYY-MM-DD` (inclusive), igual que el `min` del input
   * nativo. null/'' = sin límite inferior. Los días/meses/años fuera de rango se deshabilitan y
   * una fecha escrita a mano fuera de rango se rechaza.
   */
  @Input() min: string | null = null;
  /** Fecha máxima seleccionable en formato `YYYY-MM-DD` (inclusive). null/'' = sin límite superior. */
  @Input() max: string | null = null;
  /**
   * Color de acento del componente (label, borde/anillo al enfocar y día seleccionado).
   * Acepta cualquier valor CSS de color o variable de la paleta (ej. 'var(--color-abril-primary)').
   * Por defecto usa el verde lima de la marca.
   */
  @Input() color: string = 'var(--color-abril-lime)';
  /**
   * Opcional. true = el campo adopta exactamente las medidas del trigger de `app-search-select`
   * (34px de alto, 12px de texto, radio 7px, mismo borde). Sirve para que en una fila donde el
   * date-picker convive con comboboxes no se vea más grande que ellos — que era el caso en el
   * modal de Programar EMO con clínica.
   *
   * Por defecto false: el tamaño histórico (más alto, texto 14px) se mantiene intacto para los
   * ~26 consumidores que ya existen.
   */
  @Input() dense: boolean = false;
  /**
   * Opcional. true = el label flota cortando el borde superior del campo, igual que hace
   * `app-search-select` y que las clases globales `.abril-field-label`. Incluye el mismo
   * `margin-top` de 9px que usa el combobox, para que ambos queden a la misma altura al
   * compartir una fila.
   *
   * Por defecto false: el label sigue yendo encima del campo, en el color de acento.
   */
  @Input() floatingLabel: boolean = false;

  /** Clases del trigger según `dense`. Único origen de verdad del tamaño del campo. */
  get triggerSizeClasses(): string {
    return this.dense
      ? 'h-[34px] text-[12px] pl-[10px] pr-[8px] rounded-[7px]'
      : 'py-[10px] pl-[12px] pr-[10px] text-sm rounded-lg';
  }

  /** Borde en reposo: el mismo gris del combobox en modo `dense`. */
  get triggerBorderClass(): string {
    return this.dense ? 'border-[#e2e8f0]' : 'border-[#D6DEE5]';
  }

  readonly diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  private readonly nombresMes = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  /** Nombres cortos para la grilla del selector de mes. */
  readonly mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  /** Ancho del panel del calendario; se usa para decidir a qué lado anclarlo. */
  private readonly anchoPanel = 272;
  /**
   * Alto aproximado del panel. Solo se usa para decidir si abre hacia abajo o hacia arriba en el
   * primer cálculo, cuando el panel todavía no está en el DOM y no se puede medir de verdad.
   */
  private readonly altoPanelEstimado = 310;

  /** Panel desplegable; se mide para decidir de qué lado del campo abrirlo. */
  @ViewChild('panel') private panelRef?: ElementRef<HTMLElement>;

  isOpen = false;
  /** Texto editable del input, en formato `dd/mm/aaaa`. */
  texto = '';
  /**
   * Posición del panel (`position: fixed`, calculada respecto al viewport). Usar `fixed` en vez
   * de `absolute` evita que el panel (más ancho que el campo) estire el contenedor cuando este
   * está dentro de un elemento con scroll (ej. la tabla del cronograma): con `absolute` el panel
   * formaba parte del ancho scrolleable del contenedor, ocultando días y cerrándose al tocar
   * la barra de scroll horizontal que aparecía.
   *
   * Como `fixed` no acompaña al scroll por sí solo, la posición se recalcula en cada scroll
   * (ver `reposicionar`) para que el panel siga pegado al campo. El anclaje vertical es por
   * `top` (panel debajo del campo) o por `bottom` (panel encima, cuando abajo no entra);
   * el que no se usa queda en null para que Angular no escriba esa propiedad.
   */
  panelTop: number | null = 0;
  panelBottom: number | null = null;
  panelLeft = 0;

  /**
   * Handler de scroll/resize (capturing): recoloca el panel para que siga al campo. Los scrolls
   * originados dentro del propio componente se ignoran (no mueven el campo).
   */
  private readonly onAncestorScroll = (event?: Event) => {
    if (event?.target instanceof Node && this.el.nativeElement.contains(event.target)) return;
    this.reposicionar();
  };

  /**
   * Ancestro que hace de bloque contenedor de los `position: fixed` (uno con transform/filter/etc.),
   * resuelto al abrir. null = el bloque contenedor es el viewport, que es el caso normal.
   */
  private bloqueFijo: HTMLElement | null = null;

  /** Ancestros que pueden recortar el campo (scroll u `overflow: hidden`), cacheados al abrir. */
  private contenedoresRecorte: HTMLElement[] = [];

  private destruido = false;

  /** Mes (0-11) y año visibles en el calendario. */
  vistaMes = 0;
  vistaAnio = 0;
  semanas: DiaCelda[][] = [];

  /** Vista activa del panel: grilla de días, selector de mes o selector de año. */
  vista: 'dias' | 'meses' | 'anios' = 'dias';
  /** Primer año del bloque de 12 visible en el selector de año. */
  anioBase = 0;

  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) this.texto = this.formatoLegible(this.value);
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (typeof document !== 'undefined') {
      document.removeEventListener('scroll', this.onAncestorScroll, true);
      window.removeEventListener('resize', this.onAncestorScroll);
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent) {
    if (this.isOpen && !this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

  get hasValue(): boolean {
    return !!this.parse(this.value);
  }

  get nombreMesVista(): string {
    return this.nombresMes[this.vistaMes];
  }

  /** Años del bloque visible en el selector de año. */
  get aniosGrid(): number[] {
    return Array.from({ length: 12 }, (_, i) => this.anioBase + i);
  }

  get etiquetaRangoAnios(): string {
    return `${this.anioBase} – ${this.anioBase + 11}`;
  }

  abrir() {
    if (this.disabled || this.isOpen) return;
    this.isOpen = true;
    this.vista = 'dias';
    this.contenedoresRecorte = this.calcularContenedoresRecorte();
    this.bloqueFijo = bloqueContenedorFijo(this.el.nativeElement);
    this.posicionarPanel();
    if (typeof document !== 'undefined') {
      // Captura: los contenedores internos con scroll (ej. la tabla del cronograma) no
      // burbujean su evento 'scroll', por lo que hay que escucharlo en fase de captura.
      document.addEventListener('scroll', this.onAncestorScroll, true);
      window.addEventListener('resize', this.onAncestorScroll);
      // Recolocar ya con el alto real: al abrir, el panel todavía no existe en el DOM.
      setTimeout(() => this.reposicionar());
    }
    this.initVista();
  }

  toggleCalendario(event: MouseEvent) {
    event.stopPropagation();
    if (this.disabled) return;
    if (this.isOpen) this.close();
    else this.abrir();
  }

  close() {
    this.isOpen = false;
    this.vista = 'dias';
    this.contenedoresRecorte = [];
    this.bloqueFijo = null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('scroll', this.onAncestorScroll, true);
      window.removeEventListener('resize', this.onAncestorScroll);
    }
  }

  /**
   * Recalcula la posición del panel tras un scroll/resize para que siga al campo. Si el campo
   * dejó de verse (salió del viewport o lo recortó un contenedor con scroll) se cierra, para que
   * el panel no quede flotando sobre contenido que no le corresponde.
   *
   * El `detectChanges` es indispensable: el listener se registra con `addEventListener` (no con
   * un binding de Angular) y la app corre zoneless, así que sin él el cambio de posición no se
   * pintaría y el panel se quedaría clavado donde estaba.
   */
  private reposicionar() {
    if (this.destruido || !this.isOpen || typeof window === 'undefined') return;
    const rect = this.el.nativeElement.getBoundingClientRect();
    if (this.anclaVisible(rect)) this.posicionarPanel(rect);
    else this.close();
    this.cdr.detectChanges();
  }

  /** Calcula la posición del panel (`fixed`), pegado al campo y ajustado para no salirse del viewport. */
  private posicionarPanel(rect?: DOMRect) {
    if (typeof window === 'undefined') return;
    const r = rect ?? (this.el.nativeElement.getBoundingClientRect() as DOMRect);
    const margen = 12;
    const left = Math.max(Math.min(r.left, window.innerWidth - this.anchoPanel - margen), margen);

    // Los `fixed` se miden contra el viewport salvo que algún ancestro tenga transform/filter/etc.,
    // en cuyo caso ese ancestro pasa a ser su bloque contenedor y hay que descontarle su origen
    // (ver `bloqueContenedorFijo`). Sin esto, un campo dentro del cajón de filtros —que se abre y
    // se cierra con `translate-x-*`— dibujaba el calendario fuera de la pantalla.
    const cb = this.bloqueFijo?.getBoundingClientRect();
    this.panelLeft = Math.round(left - (cb?.left ?? 0));

    // Abre hacia arriba solo si debajo del campo no entra y encima hay más espacio. En ese caso
    // se ancla por `bottom` para que siga pegado al campo aunque cambie de alto (las grillas de
    // días, meses y años no miden lo mismo).
    const alto = this.panelRef?.nativeElement.offsetHeight || this.altoPanelEstimado;
    const espacioAbajo = window.innerHeight - r.bottom - margen;
    const espacioArriba = r.top - margen;
    if (espacioAbajo < alto && espacioArriba > espacioAbajo) {
      this.panelTop = null;
      this.panelBottom = Math.round((cb?.bottom ?? window.innerHeight) - r.top + 4);
    } else {
      this.panelBottom = null;
      this.panelTop = Math.round(r.bottom + 4 - (cb?.top ?? 0));
    }
  }

  private calcularContenedoresRecorte(): HTMLElement[] {
    return contenedoresQueRecortan(this.el.nativeElement as HTMLElement);
  }

  /** true si el campo sigue a la vista: dentro del viewport y sin que lo recorte ningún ancestro. */
  private anclaVisible(rect: DOMRect): boolean {
    return anclaSigueVisible(rect, this.contenedoresRecorte);
  }

  /** Alterna entre la grilla de días y el selector de mes (click en el mes de la cabecera). */
  toggleVistaMeses() {
    this.vista = this.vista === 'meses' ? 'dias' : 'meses';
  }

  /** Alterna entre la vista actual y el selector de año (click en el año de la cabecera). */
  toggleVistaAnios() {
    if (this.vista === 'anios') {
      this.vista = 'dias';
      return;
    }
    this.anioBase = this.vistaAnio - (this.vistaAnio % 12);
    this.vista = 'anios';
  }

  seleccionarMes(mes: number) {
    if (this.mesDeshabilitado(mes)) return;
    this.vistaMes = mes;
    this.vista = 'dias';
    this.construirGrid();
  }

  seleccionarAnio(anio: number) {
    if (this.anioDeshabilitado(anio)) return;
    this.vistaAnio = anio;
    this.vista = 'dias';
    this.construirGrid();
  }

  /** Navegación izquierda de la cabecera según la vista activa. */
  navPrev() {
    if (this.vista === 'dias') this.mesAnterior();
    else if (this.vista === 'meses') this.vistaAnio--;
    else this.anioBase -= 12;
  }

  /** Navegación derecha de la cabecera según la vista activa. */
  navNext() {
    if (this.vista === 'dias') this.mesSiguiente();
    else if (this.vista === 'meses') this.vistaAnio++;
    else this.anioBase += 12;
  }

  esMesActual(mes: number): boolean {
    const t = new Date();
    return t.getFullYear() === this.vistaAnio && t.getMonth() === mes;
  }

  esAnioActual(anio: number): boolean {
    return new Date().getFullYear() === anio;
  }

  // ── Rango permitido (min / max) ───────────────────────────────────────

  /** true si el día cae fuera de [min, max] y por lo tanto no se puede elegir. */
  esDeshabilitado(celda: DiaCelda): boolean {
    return this.fueraDeRango(celda.anio, celda.mes, celda.dia);
  }

  /** true si el mes completo (del año en vista) queda fuera de [min, max]. */
  mesDeshabilitado(mes: number): boolean {
    const ultimoDia = new Date(this.vistaAnio, mes + 1, 0).getDate();
    return this.rangoSinInterseccion(
      this.clave(this.vistaAnio, mes, 1),
      this.clave(this.vistaAnio, mes, ultimoDia),
    );
  }

  /** true si el año completo queda fuera de [min, max]. */
  anioDeshabilitado(anio: number): boolean {
    return this.rangoSinInterseccion(this.clave(anio, 0, 1), this.clave(anio, 11, 31));
  }

  /** El botón "Hoy" se apaga si la fecha de hoy no está dentro del rango permitido. */
  get hoyDeshabilitado(): boolean {
    const t = new Date();
    return this.fueraDeRango(t.getFullYear(), t.getMonth(), t.getDate());
  }

  /**
   * Autoformatea lo escrito insertando las `/` de `dd/mm/aaaa` a medida que se teclea
   * (ej. `12` → `12/`, `1204` → `12/04/`). Al borrar no se re-insertan las barras para
   * no pelear con el usuario. Solo se conservan dígitos (máx. 8).
   */
  onTextoChange(valor: string) {
    const borrando = valor.length < this.texto.length;
    const digitos = valor.replace(/\D/g, '').slice(0, 8);

    let out: string;
    if (digitos.length > 4) out = `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
    else if (digitos.length === 4) out = borrando ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : `${digitos.slice(0, 2)}/${digitos.slice(2)}/`;
    else if (digitos.length === 3) out = `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
    else if (digitos.length === 2) out = borrando ? digitos : `${digitos}/`;
    else out = digitos;

    this.texto = out;
  }

  /**
   * Valida lo escrito a mano (al salir del campo o con Enter): acepta `dd/mm/aaaa`
   * (también con `-` o `.`), emite si es una fecha real y revierte el texto si no lo es.
   * El año también puede escribirse con 2 dígitos (ej. `26`): se autocompleta a `20xx`.
   */
  confirmarTexto() {
    const t = this.texto.trim();

    if (!t) {
      if (this.hasValue) this.emitir(null);
      else this.texto = '';
      return;
    }

    const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/.exec(t);
    if (m) {
      const dia = +m[1];
      const mes = +m[2] - 1;
      const anio = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      const diasEnMes = new Date(anio, mes + 1, 0).getDate();
      const enRango = !this.fueraDeRango(anio, mes, dia);
      if (mes >= 0 && mes <= 11 && dia >= 1 && dia <= diasEnMes && enRango) {
        const nuevo = this.format(anio, mes, dia);
        if (nuevo !== this.value) this.emitir(nuevo);
        else this.texto = this.formatoLegible(this.value);
        return;
      }
    }

    // Texto inválido o fuera de [min, max]: se revierte a la última fecha válida (o vacío).
    this.texto = this.formatoLegible(this.value);
  }

  onEnter() {
    this.confirmarTexto();
    this.close();
  }

  clear(event: MouseEvent) {
    event.stopPropagation();
    this.emitir(null);
  }

  hoy() {
    if (this.hoyDeshabilitado) return;
    const t = new Date();
    this.emitir(this.format(t.getFullYear(), t.getMonth(), t.getDate()));
    this.close();
  }

  seleccionar(celda: DiaCelda) {
    if (this.esDeshabilitado(celda)) return;
    this.emitir(this.format(celda.anio, celda.mes, celda.dia));
    this.close();
  }

  esSeleccionado(celda: DiaCelda): boolean {
    const p = this.parse(this.value);
    return !!p && p.anio === celda.anio && p.mes === celda.mes && p.dia === celda.dia;
  }

  esHoy(celda: DiaCelda): boolean {
    const t = new Date();
    return t.getFullYear() === celda.anio && t.getMonth() === celda.mes && t.getDate() === celda.dia;
  }

  mesAnterior() {
    if (this.vistaMes === 0) { this.vistaMes = 11; this.vistaAnio--; }
    else this.vistaMes--;
    this.construirGrid();
  }

  mesSiguiente() {
    if (this.vistaMes === 11) { this.vistaMes = 0; this.vistaAnio++; }
    else this.vistaMes++;
    this.construirGrid();
  }

  anioAnterior() {
    this.vistaAnio--;
    this.construirGrid();
  }

  anioSiguiente() {
    this.vistaAnio++;
    this.construirGrid();
  }

  // ── Internos ─────────────────────────────────────────────────────────

  private emitir(valor: string | null) {
    this.value = valor;
    this.texto = this.formatoLegible(valor);
    this.valueChange.emit(valor);
    // Evento DOM que burbujea para contenedores como app-base-modal (igual que search-select).
    this.el.nativeElement.dispatchEvent(new Event('modalfieldchange', { bubbles: true }));
  }

  /** Posiciona la vista en la fecha seleccionada o, si no hay, en el mes actual. */
  private initVista() {
    const p = this.parse(this.value);
    const base = p ?? this.mesInicialSinValor();
    this.vistaAnio = base.anio;
    this.vistaMes = base.mes;
    this.construirGrid();
  }

  /**
   * Mes en el que abre el calendario cuando todavía no hay fecha elegida: el de hoy, salvo que
   * quede fuera de [min, max] (ej. una fecha de nacimiento con `max` 18 años atrás), en cuyo caso
   * abre en el extremo del rango más cercano. Abrir en un mes entero deshabilitado obligaría a
   * navegar años hacia atrás antes de poder elegir algo.
   */
  private mesInicialSinValor(): { anio: number; mes: number } {
    const hoy = new Date();
    const actual = { anio: hoy.getFullYear(), mes: hoy.getMonth() };
    const min = this.parse(this.min);
    const max = this.parse(this.max);
    const clave = this.clave(actual.anio, actual.mes, 1);
    if (max && clave > this.clave(max.anio, max.mes, 1)) return { anio: max.anio, mes: max.mes };
    if (min && clave < this.clave(min.anio, min.mes, 1)) return { anio: min.anio, mes: min.mes };
    return actual;
  }

  /** Desglosa el mes visible en semanas lunes-a-domingo, con relleno de los meses vecinos. */
  private construirGrid() {
    const anio = this.vistaAnio;
    const mes = this.vistaMes;
    const primerDia = new Date(anio, mes, 1);
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();
    const diasMesPrevio = new Date(anio, mes, 0).getDate();

    // getDay(): 0=domingo..6=sábado → lo paso a 0=lunes..6=domingo.
    const offsetInicio = (primerDia.getDay() + 6) % 7;

    const prev = mes === 0 ? { mes: 11, anio: anio - 1 } : { mes: mes - 1, anio };
    const next = mes === 11 ? { mes: 0, anio: anio + 1 } : { mes: mes + 1, anio };

    const celdas: DiaCelda[] = [];

    for (let i = offsetInicio - 1; i >= 0; i--) {
      celdas.push({ dia: diasMesPrevio - i, mes: prev.mes, anio: prev.anio, delMes: false });
    }
    for (let d = 1; d <= diasEnMes; d++) {
      celdas.push({ dia: d, mes, anio, delMes: true });
    }
    let diaSiguiente = 1;
    while (celdas.length % 7 !== 0) {
      celdas.push({ dia: diaSiguiente++, mes: next.mes, anio: next.anio, delMes: false });
    }

    this.semanas = [];
    for (let i = 0; i < celdas.length; i += 7) {
      this.semanas.push(celdas.slice(i, i + 7));
    }
  }

  /** Fecha comparable como entero `aaaammdd`, para no crear `Date` en cada celda de la grilla. */
  private clave(anio: number, mes: number, dia: number): number {
    return anio * 10000 + (mes + 1) * 100 + dia;
  }

  /** `YYYY-MM-DD` → entero `aaaammdd`, o null si el valor no es una fecha. */
  private claveDe(v: string | null | undefined): number | null {
    const p = this.parse(v);
    return p ? this.clave(p.anio, p.mes, p.dia) : null;
  }

  /** true si la fecha cae fuera de [min, max]. Sin min ni max nunca está fuera de rango. */
  private fueraDeRango(anio: number, mes: number, dia: number): boolean {
    const n = this.clave(anio, mes, dia);
    const min = this.claveDe(this.min);
    const max = this.claveDe(this.max);
    return (min !== null && n < min) || (max !== null && n > max);
  }

  /**
   * true si el intervalo [desde, hasta] (un mes o un año completo) no comparte ningún día con
   * [min, max]. Se compara el intervalo entero y no sus extremos por separado, porque con min y
   * max dentro del mismo mes ambos extremos quedan fuera y el mes sí tiene días válidos.
   */
  private rangoSinInterseccion(desde: number, hasta: number): boolean {
    const min = this.claveDe(this.min);
    const max = this.claveDe(this.max);
    return (min !== null && hasta < min) || (max !== null && desde > max);
  }

  private format(anio: number, mes: number, dia: number): string {
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  /** `YYYY-MM-DD` → `dd/mm/aaaa` para mostrar en el input (o '' si no hay valor). */
  private formatoLegible(v: string | null | undefined): string {
    const p = this.parse(v);
    if (!p) return '';
    return `${String(p.dia).padStart(2, '0')}/${String(p.mes + 1).padStart(2, '0')}/${p.anio}`;
  }

  private parse(v: string | null | undefined): { anio: number; mes: number; dia: number } | null {
    if (!v) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (!m) return null;
    return { anio: +m[1], mes: +m[2] - 1, dia: +m[3] };
  }
}
