import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  anclaSigueVisible,
  bloqueContenedorFijo,
  contenedoresQueRecortan,
} from '../../utils/panel-flotante.util';

@Component({
  selector: 'app-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-select.html',
  styleUrl: './search-select.css',
})
export class SearchSelect implements OnDestroy {
  @Input() options: any[] = [];
  @Input() valueField: string = 'id';
  @Input() displayField: string = 'name';
  @Input() value: any = null;
  @Output() valueChange = new EventEmitter<any>();
  @Input() label: string = '';
  @Input() showLabel: boolean = true;
  /** true = agrega un asterisco rojo al label para marcar el campo como obligatorio. */
  @Input() required: boolean = false;
  @Input() placeholder: string = 'Selecciona';
  @Input() allowClear: boolean = true;
  /** Trigger más chico (26px alto, texto 11px) para celdas de tabla o filas densas. */
  @Input() compact: boolean = false;
  /** Si es true, muestra el texto completo (sin truncar con "…") tanto en el trigger como en las opciones. */
  @Input() fullText: boolean = false;
  /**
   * Color de acento del componente (borde/anillo al enfocar y opción seleccionada).
   * Acepta cualquier valor CSS de color o variable de la paleta (ej. 'var(--color-abril-lime)').
   * Por defecto usa el teal estándar de formularios (--color-abril-standard).
   */
  @Input() color: string = 'var(--color-abril-standard)';
  /** Modo oscuro: fondo #354E6F, texto blanco. Para barras de filtros en dashboards. */
  @Input() dark: boolean = false;
  /**
   * Fondo/texto tipo "badge" para el trigger, en vez del combobox blanco con borde estándar.
   * Pasar `{ background: '#fee2e2', color: '#991b1b' }` — pensado para columnas de severidad/estado
   * dentro de una tabla (ej. nivel de consecuencia), donde el valor seleccionado debe leerse como
   * una etiqueta de color, no como un campo de formulario. No usar `::ng-deep` por página para esto:
   * si aparece un caso nuevo, agregar el color acá y listo, reutilizable en cualquier tabla.
   */
  @Input() badgeStyle: { background: string; color: string } | null = null;
  /** Si es true, el desplegable queda bloqueado: no se abre, no se limpia y no se puede cambiar. */
  @Input() disabled: boolean = false;
  /**
   * Ordena las opciones alfabéticamente por `displayField` (una sola vez, acá, para que ninguna
   * página tenga que acordarse de hacerlo). La opción "Todos/Todas" (valueField === null/undefined/'')
   * queda siempre fija primero, sin importar su texto. Poner en `false` solo cuando el orden es
   * semántico y no alfabético (ej. meses Ene→Dic, severidad Bajo→Crítico, año ascendente).
   */
  @Input() sortAlpha: boolean = true;
  /**
   * Muestra todas las etiquetas en MAYÚSCULA, vengan como vengan de la base de datos.
   * Desactiva el suavizado a formato de nombre propio que hace `formatLabel` por defecto.
   *
   * Es para catálogos de códigos y siglas, donde ese suavizado es directamente un error:
   * el código de moneda "PEN" se leía "Pen" y "USD" se leía "Usd". Usarlo solo en esos
   * casos — para nombres (proyectos, personas, empresas) el default es el correcto.
   */
  @Input() uppercase: boolean = false;

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  /** Botón del combobox: es lo que se mide para colocar el desplegable (ver `panelTop`). */
  @ViewChild('trigger') private triggerRef?: ElementRef<HTMLElement>;
  /** Panel desplegable; se mide para decidir de qué lado del combobox abrirlo. */
  @ViewChild('panel') private panelRef?: ElementRef<HTMLElement>;

  isOpen = false;
  searchText = '';

  /**
   * Posición del desplegable (`position: fixed`, calculada respecto al viewport). Usar `fixed` en
   * vez de `absolute` es lo que le permite salirse de su contenedor: dentro de un modal angosto
   * (o de cualquier caja con `overflow: hidden`) un panel `absolute` queda recortado, y la
   * alternativa —dejar que el contenedor crezca— haría que el modal se agrande y se achique cada
   * vez que se abre y se cierra el combo. Es el mismo mecanismo que ya usan `app-date-picker` y
   * `app-time-picker`, que abren su panel así por este mismo motivo.
   *
   * Como `fixed` no acompaña al scroll por sí solo, la posición se recalcula en cada scroll (ver
   * `reposicionar`). El anclaje vertical es por `top` (panel debajo del combo) o por `bottom`
   * (panel encima, cuando abajo no entra); el que no se usa queda en null para que Angular no
   * escriba esa propiedad.
   *
   * OJO: un ancestro con `transform` sí vuelve a recortar el panel, porque pasa a ser el bloque
   * contenedor de los `fixed` que cuelgan de él. Un modal propio tiene que centrarse con flex o
   * con `inset: 0; margin: auto`, no con `translate(-50%, -50%)`.
   */
  panelTop: number | null = 0;
  panelBottom: number | null = null;
  panelLeft = 0;
  /** Ancho del panel: el del propio combobox, para que se vea igual que cuando era `absolute`. */
  panelWidth = 0;

  /**
   * Alto aproximado del panel. Solo se usa para decidir si abre hacia abajo o hacia arriba en el
   * primer cálculo, cuando el panel todavía no está en el DOM y no se puede medir de verdad
   * (buscador + lista de opciones, que está topada en 200px).
   */
  private readonly altoPanelEstimado = 240;

  /**
   * Ancestro que hace de bloque contenedor de los `position: fixed` (uno con transform/filter/etc.),
   * resuelto al abrir. null = el bloque contenedor es el viewport, que es el caso normal.
   */
  private bloqueFijo: HTMLElement | null = null;

  /** Ancestros que pueden recortar el combobox (scroll u `overflow: hidden`), cacheados al abrir. */
  private contenedoresRecorte: HTMLElement[] = [];

  private destruido = false;

  /**
   * Handler de scroll/resize (capturing): recoloca el panel para que siga al combobox. Los scrolls
   * originados dentro del propio componente (la lista de opciones scrollea) no mueven el combo,
   * así que se ignoran — solo cuentan los de ancestros reales.
   */
  private readonly onAncestorScroll = (event?: Event) => {
    if (event?.target instanceof Node && this.el.nativeElement.contains(event.target)) return;
    this.reposicionar();
  };

  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.destruido = true;
    this.desconectarListeners();
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent) {
    if (this.isOpen && !this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen) this.close();
  }

  /** Quita tildes/diacríticos y pasa a minúsculas para comparar (ej. "Máximo" ≈ "maximo"). */
  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  /** `options`, ordenadas alfabéticamente si corresponde (ver `sortAlpha`). */
  private get baseOptions(): any[] {
    if (!this.sortAlpha) return this.options;
    const isPlaceholder = (opt: any) => {
      const v = opt[this.valueField];
      // 0 también cuenta como "sin selección" — mismo criterio que `hasValue`, usado en
      // varias páginas como sentinel de "Todos" en campos numéricos (ej. clinicaId: 0).
      return v === null || v === undefined || v === '' || v === 0;
    };
    const pinned = this.options.filter(isPlaceholder);
    const rest = this.options
      .filter(opt => !isPlaceholder(opt))
      .slice()
      .sort((a, b) =>
        this.formatLabel(String(a[this.displayField])).localeCompare(this.formatLabel(String(b[this.displayField]))),
      );
    return [...pinned, ...rest];
  }

  get filteredOptions(): any[] {
    const base = this.baseOptions;
    if (!this.searchText.trim()) return base;
    const words = this.searchText.trim().split(/\s+/).map(w => this.normalize(w));
    return base.filter(opt => {
      const label = this.normalize(String(opt[this.displayField]));
      return words.every(w => label.includes(w));
    });
  }

  get selectedLabel(): string {
    const empty = this.value === null || this.value === undefined || this.value === 0;
    if (empty) return this.placeholder;
    const found = this.options.find(opt => opt[this.valueField] === this.value);
    return found ? this.formatLabel(String(found[this.displayField])) : this.placeholder;
  }

  /**
   * Suaviza etiquetas que llegan en MAYÚSCULA TOTAL desde la base de datos (ej. "AMANCAE") a
   * formato de nombre propio ("Amancae"), que se lee más profesional. Si el texto ya viene con
   * mayúsculas/minúsculas mixtas (ej. siglas como "TI" combinadas con palabras normales) se deja
   * intacto para no romper esos casos.
   */
  optionLabel(option: any): string {
    return this.formatLabel(String(option[this.displayField]));
  }

  private formatLabel(text: string): string {
    if (!text) return text;
    if (this.uppercase) return text.toUpperCase();
    const isAllCaps = text === text.toUpperCase() && text !== text.toLowerCase();
    if (!isAllCaps) return text;
    return text.toLowerCase().replace(/(^|[\s\-/])([a-záéíóúñ])/g, (_m, sep, c) => sep + c.toUpperCase());
  }

  /**
   * Alto/tipografía del trigger, según `compact`/`dark`. Único origen de verdad para el tamaño —
   * una página no puede cambiarlo con CSS local, solo forzando estos dos Inputs.
   *
   * Con `fullText` el alto fijo pasa a ser un **mínimo** más padding vertical: el texto
   * seleccionado puede ocupar varias líneas y el trigger crece hacia abajo en vez de que el
   * texto se salga de su propio borde (con `h-[...]` fijo se desbordaba, porque `.ss-full`
   * quita el truncado). El padding está calculado para que, cuando el texto entra en una sola
   * línea, el alto resultante quede por debajo del mínimo y el trigger mida exactamente lo
   * mismo que sin `fullText` — así una fila con comboboxes y date-pickers sigue alineada.
   */
  get triggerSizeClasses(): string {
    if (this.compact) {
      if (this.dark) return this.fullText ? 'min-h-[22px] py-[1px] text-[10px] pl-[8px] pr-[6px]' : 'h-[22px] text-[10px] pl-[8px] pr-[6px]';
      return this.fullText ? 'min-h-[26px] py-[3px] text-[11px] pl-[8px] pr-[6px]' : 'h-[26px] text-[11px] pl-[8px] pr-[6px]';
    }
    if (this.dark) return this.fullText ? 'min-h-[30px] py-[5px] text-[11px] pl-[10px] pr-[8px]' : 'h-[30px] text-[11px] pl-[10px] pr-[8px]';
    return this.fullText ? 'min-h-[34px] py-[7px] text-[12px] pl-[10px] pr-[8px]' : 'h-[34px] text-[12px] pl-[10px] pr-[8px]';
  }

  get hasValue(): boolean {
    return this.value !== null && this.value !== undefined && this.value !== 0;
  }

  /**
   * El desplegable abre/cierra en `pointerdown`, no en `click`.
   *
   * Con mouse la diferencia casi no se nota (la pulsación dura unas decenas de ms), pero
   * en touch el navegador NO puede disparar `click` hasta el `touchend`: hasta que no se
   * levanta el dedo, el gesto todavía podría convertirse en un scroll. Eso hacía que en
   * móvil el desplegable pareciera tardar en abrirse — no era lentitud de render, era el
   * navegador esperando a saber si el toque era un tap o un arrastre. Respondiendo al
   * contacto en vez de a la soltada, se abre al instante en ambos.
   *
   * Contrapartida asumida: si alguien empieza un scroll con el dedo justo encima del
   * combo, el desplegable se abre igual. Es un blanco chico y el desplegable sale por
   * debajo del trigger (no bajo el dedo), así que no se selecciona nada por accidente.
   *
   * OJO: acá no se corta la propagación a propósito — el `document:pointerdown` de los
   * demás desplegables abiertos necesita ver este evento para poder cerrarse.
   */
  onTriggerPointerDown(event: PointerEvent) {
    if (this.disabled) return;
    // Solo el contacto/botón primario: con el secundario se abre el menú del navegador.
    if (event.button !== 0) return;
    this.togglePanel();
  }

  /**
   * El click ya no abre nada (lo hizo `pointerdown`), pero se sigue frenando para que un
   * contenedor con su propio `(click)` — una fila de tabla, por ejemplo — no se dispare
   * al usar el combo.
   *
   * `detail === 0` identifica el click que sintetiza el teclado con Enter/Espacio, que no
   * emite `pointerdown`: ese caso sí tiene que abrir acá, si no el combobox dejaría de
   * poder operarse sin mouse.
   */
  onTriggerClick(event: MouseEvent) {
    event.stopPropagation();
    if (this.disabled) return;
    if (event.detail === 0) this.togglePanel();
  }

  private togglePanel() {
    if (this.isOpen) {
      this.close();
      return;
    }
    this.abrir();
  }

  private abrir() {
    this.isOpen = true;
    this.searchText = '';
    this.contenedoresRecorte = this.calcularContenedoresRecorte();
    this.bloqueFijo = bloqueContenedorFijo(this.el.nativeElement);
    this.posicionarPanel();
    if (typeof document !== 'undefined') {
      // Captura: los contenedores internos con scroll (una tabla, el cuerpo de un modal) no
      // burbujean su evento 'scroll', así que hay que escucharlo en fase de captura.
      document.addEventListener('scroll', this.onAncestorScroll, true);
      window.addEventListener('resize', this.onAncestorScroll);
    }
    // Recolocar ya con el alto real: al abrir, el panel todavía no existe en el DOM.
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
      this.reposicionar();
    });
  }

  /**
   * Recalcula la posición del panel tras un scroll/resize para que siga al combobox. Si el combo
   * dejó de verse (salió del viewport o lo recortó un contenedor con scroll) se cierra, para que
   * el panel no quede flotando sobre contenido que no le corresponde.
   *
   * El `detectChanges` es indispensable: el listener se registra con `addEventListener` (no con un
   * binding de Angular) y la app corre zoneless, así que sin él el cambio de posición no se
   * pintaría y el panel se quedaría clavado donde estaba.
   */
  private reposicionar() {
    if (this.destruido || !this.isOpen || typeof window === 'undefined') return;
    const rect = this.rectDelTrigger();
    if (rect && this.anclaVisible(rect)) this.posicionarPanel(rect);
    else this.close();
    this.cdr.detectChanges();
  }

  /** Caja del botón del combobox, que es lo que el panel tiene que seguir. */
  private rectDelTrigger(): DOMRect | null {
    const nodo = this.triggerRef?.nativeElement ?? (this.el.nativeElement as HTMLElement);
    return nodo ? (nodo.getBoundingClientRect() as DOMRect) : null;
  }

  /** Coloca el panel (`fixed`) pegado al combo y ajustado para no salirse del viewport. */
  private posicionarPanel(rect?: DOMRect | null) {
    if (typeof window === 'undefined') return;
    const r = rect ?? this.rectDelTrigger();
    if (!r) return;

    const margen = 8;
    this.panelWidth = Math.round(r.width);
    const left = Math.max(Math.min(r.left, window.innerWidth - this.panelWidth - margen), margen);

    // Los `fixed` se miden contra el viewport salvo que algún ancestro tenga transform/filter/etc.,
    // en cuyo caso ese ancestro pasa a ser su bloque contenedor y hay que descontarle su origen
    // (ver `bloqueContenedorFijo`). Sin esto, un combo dentro del cajón de filtros —que se abre y
    // se cierra con `translate-x-*`— dibujaba el desplegable fuera de la pantalla.
    const cb = this.bloqueFijo?.getBoundingClientRect();
    this.panelLeft = Math.round(left - (cb?.left ?? 0));

    // Abre hacia arriba solo si debajo del combo no entra y encima hay más espacio. En ese caso se
    // ancla por `bottom` para que siga pegado al combo aunque el panel cambie de alto (la lista se
    // acorta al escribir en el buscador).
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

  /** true si el combo sigue a la vista: dentro del viewport y sin que lo recorte ningún ancestro. */
  private anclaVisible(rect: DOMRect): boolean {
    return anclaSigueVisible(rect, this.contenedoresRecorte);
  }

  private desconectarListeners() {
    if (typeof document === 'undefined') return;
    document.removeEventListener('scroll', this.onAncestorScroll, true);
    window.removeEventListener('resize', this.onAncestorScroll);
  }

  select(option: any) {
    this.value = option[this.valueField];
    this.valueChange.emit(this.value);
    this.notifyChange();
    this.close();
    this.searchText = '';
  }

  clear(event: MouseEvent) {
    event.stopPropagation();
    this.value = null;
    this.valueChange.emit(null);
    this.notifyChange();
    this.searchText = '';
  }

  /**
   * Emite un evento DOM que burbujea para que contenedores como app-base-modal puedan detectar
   * que el usuario cambió este desplegable (que no produce un evento `change` nativo).
   */
  private notifyChange() {
    this.el.nativeElement.dispatchEvent(new Event('modalfieldchange', { bubbles: true }));
  }

  close() {
    this.isOpen = false;
    this.contenedoresRecorte = [];
    this.bloqueFijo = null;
    this.desconectarListeners();
  }

  trackByOption = (_index: number, option: any): any => option[this.valueField];
}
