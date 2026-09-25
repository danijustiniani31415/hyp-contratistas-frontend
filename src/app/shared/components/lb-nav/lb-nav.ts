import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LbAuthService } from '../../../core/services/lb-auth.service';

/**
 * Navegación entre las pantallas de Las Bravas. Cada link se muestra solo si el usuario tiene
 * al menos uno de los permisos que gobiernan ese módulo — antes esto mostraba todos los links a
 * cualquier usuario logueado, sin importar su rol (bug real: cualquiera veía "Roles y Permisos",
 * "Compras", etc. aunque no tuviera acceso real a esas pantallas). Los módulos sin permiso propio
 * (Personas, Tareo, Catálogo, Almacén, Datos Faltantes) son lectura de referencia usada por otras
 * pantallas (selectores) y quedan visibles para cualquier usuario autenticado, igual que en el
 * backend.
 */
@Component({
  selector: 'app-lb-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="lb-nav">
      <a routerLink="/personas" routerLinkActive="on" [routerLinkActiveOptions]="{exact: false}">Personas</a>
      <a routerLink="/tareo" routerLinkActive="on">Tareo</a>
      @if (authService.hasPermiso('PLANILLA_CALCULAR') || authService.hasPermiso('PLANILLA_CONFIGURAR')) {
        <a routerLink="/planillas" routerLinkActive="on">Planillas</a>
      }
      <a routerLink="/dashboard-planilla" routerLinkActive="on">Datos Faltantes</a>
      @if (authService.hasPermiso('ROLES_GESTIONAR')) {
        <a routerLink="/roles-permisos" routerLinkActive="on">Roles y Permisos</a>
      }
      <a routerLink="/catalogo" routerLinkActive="on">Catálogo Maestro</a>
      <a routerLink="/almacen" routerLinkActive="on">Almacén / Kardex</a>
      @if (tienePermisoPedidos()) {
        <a routerLink="/pedidos" routerLinkActive="on">Pedidos</a>
      }
      @if (authService.hasPermiso('EPP_ENTREGAR')) {
        <a routerLink="/epp" routerLinkActive="on">EPP</a>
      }
      @if (authService.hasPermiso('HERRAMIENTA_PRESTAR') || authService.hasPermiso('HERRAMIENTA_DEVOLVER')) {
        <a routerLink="/herramientas" routerLinkActive="on">Herramientas</a>
      }
      @if (authService.hasPermiso('COMPRA_CREAR') || authService.hasPermiso('COMPRA_RECIBIR')) {
        <a routerLink="/compras" routerLinkActive="on">Compras</a>
      }
      @if (tienePermisoGuias()) {
        <a routerLink="/guias-remision" routerLinkActive="on">Guías de Remisión</a>
      }
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
export class LbNav {
  constructor(public authService: LbAuthService) {}

  tienePermisoPedidos(): boolean {
    return ['PEDIDO_CREAR', 'PEDIDO_APROBAR', 'PEDIDO_ENTREGAR', 'PEDIDO_VER_TODOS', 'PEDIDO_VISAR']
      .some((codigo) => this.authService.hasPermiso(codigo));
  }

  tienePermisoGuias(): boolean {
    return ['GUIA_REMISION_VER', 'GUIA_REMISION_CREAR', 'GUIA_REMISION_ENVIAR', 'GUIA_REMISION_CONFIRMAR']
      .some((codigo) => this.authService.hasPermiso(codigo));
  }
}
