import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-base-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './base-modal.html',
  styleUrl: './base-modal.css',
})
export class BaseModal implements OnInit, OnDestroy {
  private mousedownOnBackdrop = false;
  @Input() title: string = '';
  @Input() width: string = 'w-[1000px]';
  @Input() height: string = '';
  /**
   * Si es true, una vez que el usuario MODIFICA el modal (llena un campo, elige una opción de un
   * desplegable, suelta un archivo, etc.) el modal ya NO se cierra al hacer clic fuera: solo se
   * cierra con la X. Esto evita perder por accidente la información en proceso. Mientras el modal
   * siga igual que cuando se abrió, el clic fuera lo cierra normalmente.
   */
  @Input() preventCloseWhenDirty: boolean = false;
  /** Si es true, ocupa toda la pantalla (sin backdrop ni tarjeta centrada) — para accesos rápidos móviles. */
  @Input() fullScreen: boolean = false;
  /**
   * Color de la X de cierre. Antes quedaba en el verde lima histórico mientras el título
   * ya usaba --color-abril-standard (teal) — era el único punto lima del modal, una
   * inconsistencia real, no una decisión de diseño. Se unifica: la X usa el mismo teal
   * que el título, para HP Constructores / Las Bravas (confirmado 2026-09).
   */
  @Input() closeColor: string = 'var(--color-abril-standard)';
  @Output() closeModal = new EventEmitter();

  /** El contenido del modal fue modificado respecto a su estado inicial. */
  dirty = false;

  /**
   * Marca el modal como modificado. Lo disparan los eventos que burbujean desde el contenido
   * proyectado: `input`/`change` nativos y el evento `modalfieldchange` que emiten los componentes
   * custom (search-select, file-selector) al cambiar su valor.
   */
  markDirty() {
    if (this.preventCloseWhenDirty) this.dirty = true;
  }

  onBackdropMousedown() {
    this.mousedownOnBackdrop = true;
  }

  onBackdropClick() {
    const startedOnBackdrop = this.mousedownOnBackdrop;
    this.mousedownOnBackdrop = false;
    if (!startedOnBackdrop) return;
    // Si está activado el bloqueo y el modal ya se modificó, ignorar el clic fuera.
    if (this.preventCloseWhenDirty && this.dirty) return;
    this.closeModal.emit();
  }

  close() {
    this.closeModal.emit();
  }

  /**
   * Bloquea el scroll de fondo mientras el modal está abierto — sin esto, la página de atrás
   * scrollea a la vez que el overlay del modal, dando la sensación de "dos scrollbars" (una
   * externa de la página, otra interna del modal) y de que el modal queda descentrado.
   *
   * OJO: en este layout (`shared/components/layout/layout.html`) el `<body>` NUNCA scrollea — todo
   * el shell es `h-screen` fijo y el contenido real scrollea dentro de `<main class="...
   * overflow-auto">` > `.page-content` (`overflow-y-auto`). Bloquear `document.body.style.overflow`
   * no hacía nada porque el body no era el elemento que scrolleaba; había que bloquear esos dos
   * contenedores reales. Se busca por selector (no por Input) porque `app-base-modal` es genérico y
   * no debe conocer el layout — si el layout cambia, esto deja de encontrar nada y simplemente no
   * bloquea nada, no rompe.
   *
   * Contador estático compartido por TODAS las instancias: cuando un modal se abre sobre otro
   * (ej. "Gestionar cargos" abierto desde dentro de "Nueva persona"), cada uno hace su propio
   * ngOnInit/ngOnDestroy. Sin el contador, cerrar el modal interior desbloquearía el scroll aunque
   * el exterior siguiera abierto.
   */
  private static openCount = 0;
  private static lockedEls: HTMLElement[] = [];

  private static getScrollContainers(): HTMLElement[] {
    const els: HTMLElement[] = [];
    const main = document.querySelector<HTMLElement>('main');
    if (main) els.push(main);
    const pageContent = document.querySelector<HTMLElement>('.page-content');
    if (pageContent) els.push(pageContent);
    return els;
  }

  ngOnInit(): void {
    if (typeof document === 'undefined') return;
    BaseModal.openCount++;
    if (BaseModal.openCount === 1) {
      BaseModal.lockedEls = BaseModal.getScrollContainers();
      document.body.style.overflow = 'hidden';
      BaseModal.lockedEls.forEach((el) => (el.style.overflow = 'hidden'));
    }
  }

  ngOnDestroy(): void {
    if (typeof document === 'undefined') return;
    BaseModal.openCount = Math.max(0, BaseModal.openCount - 1);
    if (BaseModal.openCount === 0) {
      document.body.style.overflow = '';
      BaseModal.lockedEls.forEach((el) => (el.style.overflow = ''));
      BaseModal.lockedEls = [];
    }
  }
}
