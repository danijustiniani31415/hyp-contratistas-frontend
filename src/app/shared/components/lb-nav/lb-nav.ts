import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Navegación mínima entre las pantallas de Las Bravas (Personas, Roles y Permisos, Catálogo).
 * Provisional: reemplazar por el sidebar real cuando el resto de Fase 1/2 esté construido y
 * tenga sentido integrarlo a NavigationService (hoy este sistema vive aparte del de Abril).
 */
@Component({
  selector: 'app-lb-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="lb-nav">
      <a routerLink="/personas" routerLinkActive="on" [routerLinkActiveOptions]="{exact: false}">Personas</a>
      <a routerLink="/tareo" routerLinkActive="on">Tareo</a>
      <a routerLink="/planillas" routerLinkActive="on">Planillas</a>
      <a routerLink="/dashboard-planilla" routerLinkActive="on">Datos Faltantes</a>
      <a routerLink="/roles-permisos" routerLinkActive="on">Roles y Permisos</a>
      <a routerLink="/catalogo" routerLinkActive="on">Catálogo Maestro</a>
      <a routerLink="/almacen" routerLinkActive="on">Almacén / Kardex</a>
      <a routerLink="/pedidos" routerLinkActive="on">Pedidos</a>
      <a routerLink="/epp" routerLinkActive="on">EPP</a>
      <a routerLink="/herramientas" routerLinkActive="on">Herramientas</a>
      <a routerLink="/compras" routerLinkActive="on">Compras</a>
      <a routerLink="/guias-remision" routerLinkActive="on">Guías de Remisión</a>
    </nav>
  `,
  styles: [`
    .lb-nav {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      padding: 0 24px;
      border-bottom: 1px solid #E2E8F0;
    }
    .lb-nav a {
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #64748B;
      text-decoration: none;
      border-bottom: 2px solid transparent;
    }
    .lb-nav a:hover { color: #1E3A5F; }
    .lb-nav a.on { color: #1E3A5F; border-bottom-color: #1E3A5F; }
  `],
})
export class LbNav {}
