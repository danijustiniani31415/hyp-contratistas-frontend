import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Encabezado único para TODAS las pantallas de Las Bravas — eyebrow + título + bajada opcional.
 * Antes cada pantalla (Personas, Tareo, Planillas, Roles y Permisos...) tenía su propio
 * `.xx-header`/`.xx-eyebrow` con valores ligeramente distintos (padding, tamaños de fuente,
 * colores) copiados y ajustados a mano — la causa real de que las pantallas se vieran parecidas
 * pero nunca idénticas. Este componente + la clase global `.lb-page` (ver styles.css) son el
 * único punto de verdad: cualquier pantalla nueva de Las Bravas los usa, no se reinventa el header.
 */
@Component({
  selector: 'app-lb-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="lb-page-header">
      <div>
        <h1>{{ titulo }}</h1>
        @if (subtitulo) { <p class="lb-hint">{{ subtitulo }}</p> }
      </div>
      <div class="lb-page-header-actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
})
export class LbPageHeader {
  @Input() titulo = '';
  @Input() subtitulo = '';
}
