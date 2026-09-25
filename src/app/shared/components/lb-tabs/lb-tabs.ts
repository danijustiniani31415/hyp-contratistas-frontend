import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LB_NAV_GROUPS, LbNavGroup, findGrupoActivo, itemsVisibles } from '../../nav/lb-nav-groups';
import { LbAuthService } from '../../../core/services/lb-auth.service';

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

  constructor(private router: Router, private authService: LbAuthService) {
    this.grupoActivo = this.filtrarGrupo(findGrupoActivo(this.router.url) ?? LB_NAV_GROUPS[0]);
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.grupoActivo = this.filtrarGrupo(findGrupoActivo(this.router.url)) ?? this.grupoActivo;
    });
  }

  private filtrarGrupo(grupo: LbNavGroup | undefined): LbNavGroup | undefined {
    if (!grupo) return undefined;
    const hasPermiso = (codigo: string) => this.authService.hasPermiso(codigo);
    return { ...grupo, items: itemsVisibles(grupo, hasPermiso) };
  }
}
