import { Component, OnDestroy, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { SidebarMobile } from '../sidebar-mobile/sidebar-mobile';
import { AlertaLoginSsoma } from '../alerta-login-ssoma/alerta-login-ssoma';
import { NavigationEnd, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { LayoutService } from '../../../core/services/layout.service';
import { SessionRefreshService } from '../../../core/services/session-refresh.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, SidebarMobile, NgIf, AlertaLoginSsoma],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout implements OnDestroy {
  mobileMenuOpen = false;
  /** true cuando la página actual monta un app-abril-page-header (que ya trae su
   *  propio hamburguesa). En ese caso el layout NO muestra el botón flotante. */
  hasPageHeader = false;

  private layoutService = inject(LayoutService);
  private sessionRefresh = inject(SessionRefreshService);
  private realtime = inject(RealtimeService);

  isFullPage = false;

  constructor(private router: Router) {
    this.layoutService.openMobileMenu$
      .pipe(takeUntilDestroyed())
      .subscribe(() => (this.mobileMenuOpen = true));

    this.layoutService.hasPageHeader$
      .pipe(takeUntilDestroyed())
      .subscribe((has) => (this.hasPageHeader = has));

    // isFullPage se calcula una sola vez por navegación (no en cada ciclo de detección de
    // cambios): evaluar this.router.url directamente como método en el template causaba
    // NG0100 (ExpressionChangedAfterItHasBeenCheckedError) cuando la URL cambiaba a mitad de
    // un ciclo de CD.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map((e) => this.calcIsFullPage(e.urlAfterRedirects)),
        startWith(this.calcIsFullPage(this.router.url)),
        takeUntilDestroyed(),
      )
      .subscribe((v) => (this.isFullPage = v));

    // Mientras el usuario está en la zona autenticada:
    // - refresco periódico del token (red de seguridad),
    // - conexión SignalR para refrescar al instante ante cambios de rol/permisos.
    this.sessionRefresh.start();
    this.realtime.start();
  }

  ngOnDestroy(): void {
    this.sessionRefresh.stop();
    this.realtime.stop();
  }

  private calcIsFullPage(url: string): boolean {
    return (
      url.includes('/habilitacion/trabajadores') ||
      url.includes('/arquitectura-comercial/dashboard') ||
      url.includes('/arquitectura-comercial/actividades') ||
      url.includes('/arquitectura-comercial/observaciones') ||
      url.includes('/arquitectura-comercial/revisiones') ||
      url.includes('/arquitectura-comercial/gantt') ||
      url.includes('/arquitectura-comercial/plantilla') ||
      url.includes('/clinica/dashboard') ||
      url.includes('/clinica/agenda') ||
      url.includes('/clinica/interconsultas') ||
      url.includes('/clinica/programaciones') ||
      url.includes('/habilitacion/dashboard-contratista') ||
      url.includes('/habilitacion/evaluar-prevencionista') ||
      url.includes('/habilitacion/mi-perfil-supervisor') ||
      url.includes('/evaluaciones/dashboard') ||
      url.includes('/evaluaciones/evaluar') ||
      url.includes('/evaluaciones/historial') ||
      url.includes('/evaluaciones/configuracion') ||
      url.includes('/mejora-continua') ||
      url.includes('/ssoma/salud-ocupacional') ||
      url.includes('/ssoma/gestion/paso') ||
      url.includes('/ssoma/gestion/rac') ||
      url.includes('/ssoma/gestion/opt') ||
      url.includes('/ssoma/gestion/inspeccion') ||
      url.includes('/ssoma/gestion/amonestaciones') ||
      url.includes('/habilitacion/gestion') ||
      url.includes('/gestion-administrativa') ||
      url.includes('/projects') ||
      url.includes('/contractors/management') ||
      url.includes('/costs/dashboard') ||
      url.includes('/costs/adjudicaciones') ||
      url.includes('/costs/configuration') ||
      url.includes('/vecinos') ||
      url.includes('/habilitacion/control-acceso') ||
      url.includes('/security') ||
      url.includes('/configuracion')
    );
  }
}
