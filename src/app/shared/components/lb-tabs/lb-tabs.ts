import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LB_NAV_GROUPS, LbNavGroup, findGrupoActivo } from '../../nav/lb-nav-groups';

/**
 * Barra de tabs horizontal con las sub-páginas del grupo activo (Personas/Tareo/Planillas/... si
 * estás en "Gestión de Personal", Pedidos/Compras/... si estás en "Gestión Logística", etc.) — la
 * sidebar solo tiene las 3 categorías, esto es la navegación DENTRO de una categoría.
 */
@Component({
  selector: 'app-lb-tabs',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './lb-tabs.html',
  styleUrl: './lb-tabs.css',
})
export class LbTabs {
  grupoActivo: LbNavGroup | undefined;

  constructor(private router: Router) {
    this.grupoActivo = findGrupoActivo(this.router.url) ?? LB_NAV_GROUPS[0];
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.grupoActivo = findGrupoActivo(this.router.url) ?? this.grupoActivo;
    });
  }
}
