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

/**
 * Selector de hora con desplegable estilizado, reemplazo del `<input type="time">` nativo
 * (que es feo y no respeta la paleta de la marca). El valor se maneja como string `HH:mm`
 * en formato de 24 horas (o null), igual que el input nativo, por lo que es un reemplazo
 * directo en formularios/filtros existentes. La hora también puede escribirse a mano en
 * formato `HH:mm` (se valida al salir del campo o con Enter).
 *
 * El color de acento (label, borde/anillo al enfocar y opción seleccionada) es configurable
 * vía `color`; por defecto usa el teal estándar de la app (`--color-abril-standard`).
 */
@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './time-picker.html',
  styleUrl: './time-picker.css',
})
export class TimePicker implements OnChanges, OnDestroy {
  @Input() label = '';
  @Input() showLabel = true;
  /** true = agrega un asterisco rojo al label para marcar el campo como obligatorio. */
  @Input() required = false;
  @Input() placeholder = '--:--';
  /** Hora seleccionada en formato `HH:mm` (24h), o null/undefined si no hay selección. */
  @Input() value: string | null | undefined = null;
  @Output() valueChange = new EventEmitter<string | null>();
  @Input() allowClear = true;
  /** Deshabilita el campo: no se puede escribir, ni abrir el desplegable, ni limpiar. */
  @Input() disabled = false;
  /**
   * Color de acento del componente (label, borde/anillo al enfocar y opción seleccionada).
   * Acepta cualquier valor CSS de color o variable de la paleta
   * (ej. 'var(--color-abril-logo-blue)'). Por defecto usa el teal estándar de la app.
   */
  @Input() color = 'var(--color-abril-standard)';
  /** Paso en minutos de la columna de minutos (1 = todos los minutos, 5 = 00,05,10...). */
  @Input() minuteStep = 1;
  /**
   * Opcional. true = el campo adopta exactamente las medidas del trigger de `app-search-select`
   * (34px de alto, 12px de texto, radio 7px, mismo borde), igual que el `dense` de
   * `app-date-picker`. Sirve para que en una fila donde la hora convive con comboboxes no se vea
   * más grande que ellos.
   *
   * Por defecto false: el tamaño histórico (más alto, texto 14px) se mantiene intacto para los
   * consumidores que ya existen.
   */
  @Input() dense = false;
  /**
   * Opcional. true = el label flota cortando el borde superior del campo, igual que hace
   * `app-search-select` y que las clases globales `.abril-field-label`. Incluye el mismo
   * `margin-top` de 9px que usa el combobox, para que ambos queden a la misma altura al
   * compartir una fila.
   *
   * Por defecto false: el label sigue yendo encima del campo, en el color de acento.
   */
  @Input() floatingLabel = false;

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

  /** Ancho del panel; se usa para decidir a qué lado anclarlo respecto del viewport. */
  private readonly anchoPanel = 176;
  /**
   * Alto aproximado del panel. Solo se usa para decidir si abre hacia abajo o hacia arriba en el
   * primer cálculo, cuando el panel todavía no está en el DOM y no se puede medir de verdad.
   */
  private readonly altoPanelEstimado = 245;

  /** Panel desplegable; se mide para decidir de qué lado del campo abrirlo. */
  @ViewChild('panel') private panelRef?: ElementRef<HTMLElement>;

  isOpen = false;
  /** Texto editable del input, en formato `HH:mm`. */
  texto = '';
  /**
   * Posición del panel (`position: fixed`, respecto al viewport) — mismo motivo que en
   * date-picker, y también como allí se recalcula en cada scroll (ver `reposicionar`) para que
   * acompañe al campo. El anclaje vertical es por `top` (panel debajo) o por `bottom` (panel
   * encima, cuando abajo no entra); el que no se usa queda en null.
   */
  panelTop: number | null = 0;
  panelBottom: number | null = null;
  panelLeft = 0;

  /**
   * Ancestro que hace de bloque contenedor de los `position: fixed` (uno con transform/filter/etc.),
   * resuelto al abrir. null = el bloque contenedor es el viewport, que es el caso normal.
   */
  private bloqueFijo: HTMLElement | null = null;

  /** Ancestros que pueden recortar el campo (scroll u `overflow: hidden`), cacheados al abrir. */
  private contenedoresRecorte: HTMLElement[] = [];

  private destruido = false;

  readonly horas: string[] = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  minutos: string[] = [];

  /**
   * Handler de scroll/resize (capturing): recoloca el panel para que siga al campo. Los scrolls
   * que se originan dentro del propio componente (las columnas de hora/minuto son scrolleables)
   * no mueven el campo, así que se ignoran — solo cuentan los de ancestros reales.
   */
  private readonly onAncestorScroll = (event?: Event) => {
    if (event?.target instanceof Node && this.el.nativeElement.contains(event.target)) return;
    this.reposicionar();
  };

  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {
    this.recalcMinutos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) this.texto = this.formatoLegible(this.value);
    if (changes['minuteStep']) this.recalcMinutos();
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

  private recalcMinutos(): void {
    const step = this.minuteStep >= 1 ? Math.floor(this.minuteStep) : 1;
    const out: string[] = [];
    for (let m = 0; m < 60; m += step) out.push(String(m).padStart(2, '0'));
    this.minutos = out;
  }

  get hasValue(): boolean {
    return !!this.parse(this.value);
  }

  /** Hora (`HH`) seleccionada actualmente, o null. */
  get selHora(): string | null {
    return this.parse(this.value)?.h ?? null;
  }

  /** Minuto (`mm`) seleccionado actualmente, o null. */
  get selMinuto(): string | null {
    return this.parse(this.value)?.m ?? null;
  }

  abrir() {
    if (this.disabled || this.isOpen) return;
    this.isOpen = true;
    this.contenedoresRecorte = this.calcularContenedoresRecorte();
    this.bloqueFijo = bloqueContenedorFijo(this.el.nativeElement);
    this.posicionarPanel();
    if (typeof document !== 'undefined') {
      document.addEventListener('scroll', this.onAncestorScroll, true);
      window.addEventListener('resize', this.onAncestorScroll);
    }
    // Deja que el panel se pinte antes de centrar las opciones seleccionadas y de recolocarlo
    // con su alto real (al abrir todavía no existe en el DOM y no se puede medir).
    setTimeout(() => {
      this.scrollSeleccionadoAlCentro();
      this.reposicionar();
    });
  }

  togglePanel(event: MouseEvent) {
    event.stopPropagation();
    if (this.disabled) return;
    if (this.isOpen) this.close();
    else this.abrir();
  }

  close() {
    this.isOpen = false;
    this.contenedoresRecorte = [];
    this.bloqueFijo = null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('scroll', this.onAncestorScroll, true);
      window.removeEventListener('resize', this.onAncestorScroll);
    }
  }

  /**
   * Recalcula la posición del panel tras un scroll/resize para que siga al campo. Si el campo
   * dejó de verse (salió del viewport o lo recortó un contenedor con scroll) se cierra.
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
    // se cierra con `translate-x-*`— dibujaba el desplegable fuera de la pantalla.
    const cb = this.bloqueFijo?.getBoundingClientRect();
    this.panelLeft = Math.round(left - (cb?.left ?? 0));

    // Abre hacia arriba solo si debajo del campo no entra y encima hay más espacio; en ese caso
    // se ancla por `bottom` para quedar pegado al campo sin depender del alto del panel.
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

  /**
   * Centra la opción seleccionada scrolleando solo su columna (`scrollTop` directo).
   * No usar `scrollIntoView`: también scrollea contenedores ancestros de la página,
   * y ese scroll externo cerraría el panel vía `onAncestorScroll`.
   */
  private scrollSeleccionadoAlCentro() {
    if (typeof document === 'undefined') return;
    const seleccionados = this.el.nativeElement.querySelectorAll('.tp-opt.tp-selected');
    seleccionados.forEach((btn: Element) => {
      const col = btn.parentElement;
      if (!col) return;
      const opt = btn as HTMLElement;
      // offsetTop se mide contra el panel (offsetParent), no contra la columna (static).
      col.scrollTop = opt.offsetTop - col.offsetTop - (col.clientHeight - opt.offsetHeight) / 2;
    });
  }

  seleccionarHora(h: string) {
    const m = this.selMinuto ?? '00';
    this.emitir(`${h}:${m}`);
    // Mantener abierto para que el usuario elija/ajuste los minutos a continuación.
  }

  seleccionarMinuto(m: string) {
    const h = this.selHora ?? '00';
    this.emitir(`${h}:${m}`);
    // Elegir el minuto confirma la hora completa; se cierra el panel.
    this.close();
  }

  esHoraActual(h: string): boolean {
    return this.horaActual().h === h;
  }

  esMinutoActual(m: string): boolean {
    return this.horaActual().m === m;
  }

  /**
   * Autoformatea lo escrito insertando `:` de `HH:mm` a medida que se teclea
   * (ej. `13` → `13:`, `1345` → `13:45`). Al borrar no se re-inserta el `:`.
   * Solo se conservan dígitos (máx. 4).
   */
  onTextoChange(valor: string) {
    const borrando = valor.length < this.texto.length;
    const digitos = valor.replace(/\D/g, '').slice(0, 4);

    let out: string;
    if (digitos.length > 2) out = `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
    else if (digitos.length === 2) out = borrando ? digitos : `${digitos}:`;
    else out = digitos;

    this.texto = out;
  }

  /**
   * Valida lo escrito a mano (al salir del campo o con Enter): acepta `H:mm`/`HH:mm`
   * (también `HHmm`), emite si es una hora real (00–23 : 00–59) y revierte el texto si no lo es.
   */
  confirmarTexto() {
    const t = this.texto.trim();

    if (!t) {
      if (this.hasValue) this.emitir(null);
      else this.texto = '';
      return;
    }

    const m = /^(\d{1,2})[:.]?(\d{2})$/.exec(t);
    if (m) {
      const hora = +m[1];
      const min = +m[2];
      if (hora >= 0 && hora <= 23 && min >= 0 && min <= 59) {
        const nuevo = `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        if (nuevo !== this.value) this.emitir(nuevo);
        else this.texto = this.formatoLegible(this.value);
        return;
      }
    }

    // Texto inválido: se revierte a la última hora válida (o vacío).
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

  ahora() {
    const t = this.horaActual();
    this.emitir(`${t.h}:${t.m}`);
    this.close();
  }

  // ── Internos ─────────────────────────────────────────────────────────

  private emitir(valor: string | null) {
    this.value = valor;
    this.texto = this.formatoLegible(valor);
    this.valueChange.emit(valor);
    // Evento DOM que burbujea para contenedores como app-base-modal (igual que search-select/date-picker).
    this.el.nativeElement.dispatchEvent(new Event('modalfieldchange', { bubbles: true }));
  }

  private horaActual(): { h: string; m: string } {
    const d = new Date();
    return {
      h: String(d.getHours()).padStart(2, '0'),
      m: String(d.getMinutes()).padStart(2, '0'),
    };
  }

  /** `HH:mm` normalizado para mostrar en el input (o '' si no hay valor). */
  private formatoLegible(v: string | null | undefined): string {
    const p = this.parse(v);
    return p ? `${p.h}:${p.m}` : '';
  }

  private parse(v: string | null | undefined): { h: string; m: string } | null {
    if (!v) return null;
    const m = /^(\d{1,2}):(\d{2})/.exec(v);
    if (!m) return null;
    const hora = +m[1];
    const min = +m[2];
    if (hora < 0 || hora > 23 || min < 0 || min > 59) return null;
    return { h: String(hora).padStart(2, '0'), m: String(min).padStart(2, '0') };
  }
}
