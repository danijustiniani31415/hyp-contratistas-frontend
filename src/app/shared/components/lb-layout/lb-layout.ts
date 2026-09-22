import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LbSidebar } from '../lb-sidebar/lb-sidebar';
import { LbTabs } from '../lb-tabs/lb-tabs';

/**
 * Shell de Las Bravas: sidebar (solo categorías) a la izquierda + tabs de la categoría activa
 * arriba + contenido con su propio scroll. Reemplaza el patrón anterior donde cada página ponía
 * <app-lb-nav /> (una barra plana con los 12 ítems) dentro de sí misma.
 */
@Component({
  selector: 'app-lb-layout',
  standalone: true,
  imports: [RouterOutlet, LbSidebar, LbTabs],
  template: `
    <div class="lb-shell">
      <app-lb-sidebar />
      <div class="lb-shell-content">
        <app-lb-tabs />
        <main class="lb-shell-main">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .lb-shell {
      display: flex; height: 100vh; background: #fff;
      /* Las Bravas es navy (#1E3A5F), no el teal de Plataforma Abril — componentes compartidos
         (paginador, search-select, filter-trigger, date-picker...) leen esta variable para su
         acento, así que sobreescribirla acá una sola vez los pone a todos en línea sin tocarlos
         uno por uno. Alcance: SOLO dentro de este shell, Abril sigue viendo su teal normal. */
      --color-abril-standard: #1E3A5F;
      --color-abril-standard-hover: #16304D;
      --color-abril-standard-light: #EEF2F7;
      --color-abril-standard-border: #D6DEE5;
    }
    .lb-shell-content { flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100vh; }
    .lb-shell-main { flex: 1; min-height: 0; overflow-y: auto; }
  `],
})
export class LbLayout {}
