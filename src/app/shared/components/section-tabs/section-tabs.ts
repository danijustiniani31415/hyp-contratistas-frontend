import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SectionTab {
  /** Identificador único de la pestaña. Es lo que se devuelve por (valueChange). */
  id: string;
  /** Texto visible. */
  label: string;
  /** Opcional: si está presente, se muestra como badge a la derecha del label. */
  badge?: string | number | null;
  /** Opcional: deshabilita la pestaña. */
  disabled?: boolean;
}

/**
 * Paginado de secciones reutilizable.
 *
 * Uso:
 * <app-section-tabs [tabs]="tabs" [(value)]="active"></app-section-tabs>
 * <div *ngIf="active === 'tab1'">...</div>
 *
 * Las pestañas siguen el mismo estilo que las tabs internas del modal "Ver Lección"
 * (`Datos generales` / `Imágenes adjuntas`): borde inferior verde corporativo,
 * pestaña activa con borde superior y laterales en verde, contenido pegado debajo.
 *
 * Cuando no entran todas, la tira se desplaza en horizontal. En móvil eso se resuelve solo
 * (se arrastra con el dedo), pero en escritorio no había forma de llegar a las pestañas
 * cortadas: la barra de scroll está oculta y el mouse no arrastra un contenedor con
 * `overflow-x`. Por eso acá hay tres accesos, y los tres empujan el MISMO scroller:
 *   • flechas a los lados, que aparecen solo cuando hay algo hacia ese lado;
 *   • arrastre con el mouse (con umbral, para no comerse el clic de la pestaña);
 *   • rueda del mouse, que en un scroller horizontal no hace nada por defecto.
 */
@Component({
  selector: 'app-section-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="st-wrap" [style.--st-accent]="color">
      <!-- Las flechas van sobre la tira (no a los lados) para no cambiar el alto ni el ancho
           del componente allí donde hoy entra sin scroll. -->
      <button
        *ngIf="puedeIzquierda"
        type="button"
        class="st-arrow st-arrow--izq"
        aria-label="Ver pestañas anteriores"
        tabindex="-1"
        (click)="desplazar(-1)">
        <i class="ti ti-chevron-left"></i>
      </button>

      <div
        #scroller
        class="st-scroll"
        [class.st-scroll--arrastrando]="arrastrando"
        (pointerdown)="onPointerDown($event)"
        (wheel)="onWheel($event)"
        (scroll)="refrescarFlechas()">
        <div class="flex min-w-max border-b border-[var(--st-accent)]">
          <button
            *ngFor="let t of tabs; trackBy: trackById"
            type="button"
            [disabled]="t.disabled"
            (click)="select(t)"
            class="st-tab cursor-pointer shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-t-lg border transition-colors flex items-center gap-2"
            [ngClass]="value === t.id
              ? 'border-t-[var(--st-accent)] border-x-[var(--st-accent)] border-b-white text-[var(--st-accent)] -mb-px bg-white'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
            [class.opacity-40]="t.disabled"
            [class.cursor-not-allowed]="t.disabled">
            {{ t.label }}
            <span
              *ngIf="t.badge != null"
              class="text-[0.65rem] font-bold bg-green-100 text-green-800 border border-green-200 rounded-full px-1.5 py-0.5">
              {{ t.badge }}
            </span>
          </button>
        </div>
      </div>

      <button
        *ngIf="puedeDerecha"
        type="button"
        class="st-arrow st-arrow--der"
        aria-label="Ver más pestañas"
        tabindex="-1"
        (click)="desplazar(1)">
        <i class="ti ti-chevron-right"></i>
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .st-wrap {
        position: relative;
        min-width: 0;
      }

      /* En pantallas angostas las pestañas no se comprimen ni parten el texto en
         columnas de una palabra (era lo que pasaba con el flex a secas): la tira
         se desplaza en horizontal, que es el patrón estándar de tabs en móvil.
         La barra de scroll se oculta — la pestaña cortada a la derecha y las flechas
         ya avisan que hay más. El .min-w-max de la fila interna la deja crecer más allá
         del contenedor, y el border-b sigue abarcando todo el ancho visible cuando
         las pestañas entran sin scroll. */
      .st-scroll {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        /* Sin touch-action: en touch el navegador sigue haciendo el paneo nativo (mejor que
           cualquier JS) y un swipe vertical que empiece sobre las pestañas sigue moviendo la
           página. El arrastre con mouse se engancha por pointerType, no por CSS. */
      }
      .st-scroll::-webkit-scrollbar {
        display: none;
      }

      /* Mientras se arrastra: cursor de agarre y sin selección de texto, que si no el
         arrastre termina seleccionando los labels de las pestañas. */
      .st-scroll--arrastrando {
        cursor: grabbing;
        user-select: none;
      }

      /* ── Flechas ────────────────────────────────────────────────────────────
         Solo con puntero fino (mouse): en touch se arrastra con el dedo y taparían
         media pestaña. El degradado difumina la pestaña cortada por debajo en vez de
         taparla con un bloque opaco. */
      .st-arrow {
        display: none;
      }

      @media (hover: hover) and (pointer: fine) {
        .st-arrow {
          position: absolute;
          top: 0;
          bottom: 1px; /* deja ver el border-b de la tira, que es la línea de la marca */
          z-index: 1;
          display: flex;
          align-items: center;
          width: 34px;
          padding: 0;
          border: 0;
          color: #6b7280;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .st-arrow:hover {
          color: var(--st-accent);
        }
        /* --st-fade es el fondo sobre el que se difumina la pestaña cortada. Blanco por
           defecto porque es el color del área de contenido del layout; un contenedor con otro
           fondo lo redefine sin tocar el componente. */
        .st-arrow--izq {
          left: 0;
          justify-content: flex-start;
          background: linear-gradient(to right, var(--st-fade, #fff) 55%, transparent);
        }
        .st-arrow--der {
          right: 0;
          justify-content: flex-end;
          background: linear-gradient(to left, var(--st-fade, #fff) 55%, transparent);
        }
      }

      @media (max-width: 639.98px) {
        .st-tab {
          padding-left: 12px;
          padding-right: 12px;
          font-size: 0.8125rem;
        }
      }
    `,
  ],
})
export class SectionTabs implements AfterViewInit, OnChanges, OnDestroy {
  @Input() tabs: SectionTab[] = [];
  @Input() value: string | null = null;
  /**
   * Color de acento (borde y texto de la pestaña activa). Acepta cualquier valor
   * CSS de color o variable de la paleta (ej. 'var(--color-abril-primary)').
   * Por defecto usa el verde lima corporativo.
   */
  @Input() color: string = '#64BC04';
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('scroller') private scroller?: ElementRef<HTMLDivElement>;

  /** Hay pestañas cortadas hacia ese lado (pinta la flecha correspondiente). */
  puedeIzquierda = false;
  puedeDerecha = false;

  /** true mientras se arrastra la tira con el mouse. */
  arrastrando = false;

  /** Cuánto avanza cada clic de flecha: casi un ancho visible, dejando un pedazo de contexto. */
  private static readonly PASO = 0.8;

  /** Píxeles de movimiento a partir de los cuales el gesto es un arrastre y no un clic. */
  private static readonly UMBRAL_ARRASTRE = 5;

  private observer?: ResizeObserver;
  private limpiarArrastre?: () => void;
  /** El scroll y el ResizeObserver pueden llegar después de destruir la vista. */
  private destruido = false;

  constructor(
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    // El ancho de la tira cambia con el contenedor (sidebar, modal, ventana) y con las
    // pestañas: un ResizeObserver cubre los dos casos sin escuchar el resize global.
    // La app prerenderiza en Node, donde ResizeObserver no existe y los hooks de vista igual
    // corren: sin el guard, el prerender de cualquier pantalla con pestañas revienta.
    const el = this.scroller?.nativeElement;
    if (!el || typeof ResizeObserver === 'undefined') return;

    this.zone.runOutsideAngular(() => {
      this.observer = new ResizeObserver(() => this.refrescarFlechas());
      this.observer.observe(el);
      if (el.firstElementChild) this.observer.observe(el.firstElementChild);
    });

    this.refrescarFlechas();
  }

  ngOnChanges(): void {
    // Las pestañas llegan por @Input y suelen cambiar después del primer render (el backend
    // devuelve los correos del módulo): hay que recalcular con el DOM ya pintado.
    queueMicrotask(() => this.refrescarFlechas());
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.observer?.disconnect();
    this.limpiarArrastre?.();
  }

  select(t: SectionTab): void {
    if (t.disabled) return;
    if (t.id === this.value) return;
    this.value = t.id;
    this.valueChange.emit(t.id);
  }

  trackById(_: number, t: SectionTab): string {
    return t.id;
  }

  // ── Desplazamiento ──────────────────────────────────────────────────────
  /** Mueve la tira un paso hacia el lado indicado (-1 izquierda, 1 derecha). */
  desplazar(direccion: -1 | 1): void {
    const el = this.scroller?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: direccion * el.clientWidth * SectionTabs.PASO, behavior: 'smooth' });
  }

  /**
   * Arrastre con el mouse. Solo con el botón principal y solo si hay algo que desplazar; en
   * touch no se engancha porque el navegador ya hace el paneo nativo (y hacerlo a mano
   * arruinaría la inercia).
   *
   * El clic de la pestaña se respeta: recién a partir del umbral se marca como arrastre, y en
   * ese caso se cancela el `click` que el navegador dispara al soltar. Sin esto, arrastrar
   * hasta la última pestaña la terminaba seleccionando.
   */
  onPointerDown(event: PointerEvent): void {
    const el = this.scroller?.nativeElement;
    if (!el || event.pointerType === 'touch' || event.button !== 0) return;
    if (el.scrollWidth <= el.clientWidth) return;

    const xInicial = event.clientX;
    const scrollInicial = el.scrollLeft;
    let movio = false;

    const onMove = (e: PointerEvent) => {
      const delta = e.clientX - xInicial;
      if (!movio && Math.abs(delta) < SectionTabs.UMBRAL_ARRASTRE) return;

      if (!movio) {
        movio = true;
        this.arrastrando = true;
        this.cdr.detectChanges();
      }
      el.scrollLeft = scrollInicial - delta;
      e.preventDefault();
    };

    const onUp = () => {
      terminar();
      if (!movio) return;

      // Se traga el clic que viene inmediatamente después de soltar (fase de captura, una
      // sola vez) para que el arrastre no active la pestaña que quedó bajo el cursor.
      const tragarClic = (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
      };
      el.addEventListener('click', tragarClic, { capture: true, once: true });
      // Si no hubo clic (el puntero se soltó fuera), el listener se retira igual.
      setTimeout(() => el.removeEventListener('click', tragarClic, true));

      this.arrastrando = false;
      this.cdr.detectChanges();
      this.refrescarFlechas();
    };

    const terminar = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      this.limpiarArrastre = undefined;
    };

    // En window y no en el elemento: si el mouse sale de la tira a media pasada, el arrastre
    // tiene que seguir vivo hasta que se suelte el botón.
    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
    this.limpiarArrastre = terminar;
  }

  /**
   * Rueda del mouse sobre la tira: la mayoría de mouses solo tiene eje vertical y un scroller
   * horizontal ignora ese eje, así que la página de atrás se movía y las pestañas no. Solo se
   * intercepta si de verdad queda recorrido hacia ese lado, para no secuestrar el scroll de la
   * página cuando la tira ya llegó al tope.
   */
  onWheel(event: WheelEvent): void {
    const el = this.scroller?.nativeElement;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (event.deltaX !== 0) return; // trackpad horizontal: el navegador ya lo resuelve

    const delta = event.deltaY;
    const tope = delta > 0
      ? el.scrollLeft >= el.scrollWidth - el.clientWidth - 1
      : el.scrollLeft <= 0;
    if (tope) return;

    event.preventDefault();
    el.scrollLeft += delta;
    this.refrescarFlechas();
  }

  /**
   * Recalcula qué flechas se pintan. Se llama desde el scroll (fuera de Angular, app zoneless),
   * así que pinta a mano y solo cuando algo cambió — el scroll dispara muchísimo.
   */
  refrescarFlechas(): void {
    const el = this.scroller?.nativeElement;
    if (!el || this.destruido) return;

    // 1px de tolerancia: con zoom del navegador scrollWidth y clientWidth quedan a fracciones
    // de píxel y la flecha derecha se quedaba pintada sin nada que mostrar.
    const izquierda = el.scrollLeft > 1;
    const derecha = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    if (izquierda === this.puedeIzquierda && derecha === this.puedeDerecha) return;

    this.puedeIzquierda = izquierda;
    this.puedeDerecha = derecha;
    this.cdr.detectChanges();
  }
}
