import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LbAuthService } from '../../../core/services/lb-auth.service';
import { LB_NAV_GROUPS, LbNavGroup, findGrupoActivo } from '../../nav/lb-nav-groups';

/**
 * Sidebar de Las Bravas — SOLO las categorías principales (3), no los 12 ítems sueltos. Al entrar
 * a una categoría, sus sub-páginas se muestran como tabs horizontales arriba del contenido
 * (`app-lb-tabs`) — mismo patrón que la referencia que pasó el usuario 2026-09-22: sidebar para
 * navegar entre TEMAS, tabs para moverse DENTRO de un tema.
 */
@Component({
  selector: 'app-lb-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lb-sidebar.html',
  styleUrl: './lb-sidebar.css',
})
export class LbSidebar {
  grupos: LbNavGroup[] = LB_NAV_GROUPS;
  grupoActivoKey: string | undefined;

  accountMenuOpen = false;
  userNombre: string | null;
  userIniciales: string;
  userRoles: string;

  /** Nombres legibles — el JWT solo trae el código (ver LbAsignacionDto), no el nombre del rol. */
  private static readonly NOMBRES_ROL: Record<string, string> = {
    ADMIN: 'Administrador del Sistema',
    GERENTE_GENERAL: 'Gerente General',
    LOGISTICA: 'Logística Central Lima',
    COMPRAS: 'Compras',
    RESIDENTE: 'Residente de Proyecto',
    ALMACENERO: 'Almacenero de Proyecto',
    ADMINISTRATIVO: 'Administrativo de Mina',
  };

  constructor(private authService: LbAuthService, private router: Router) {
    const user = this.authService.getUser();
    this.userNombre = user?.nombreCompleto ?? null;
    this.userIniciales = this.computeIniciales(this.userNombre);

    const codigos = [...new Set(this.authService.getAsignaciones().map((a) => a.rolCodigo))];
    this.userRoles = codigos.length
      ? codigos.map((c) => LbSidebar.NOMBRES_ROL[c] ?? c).join(' · ')
      : 'Sin rol asignado';

    this.grupoActivoKey = findGrupoActivo(this.router.url)?.key;
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.grupoActivoKey = findGrupoActivo(this.router.url)?.key;
    });
  }

  private computeIniciales(nombre: string | null): string {
    if (!nombre) return '?';
    return nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }

  irAGrupo(grupo: LbNavGroup): void {
    this.router.navigate([grupo.items[0].route]);
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
