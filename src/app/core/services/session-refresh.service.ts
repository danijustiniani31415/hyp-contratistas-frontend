import { Injectable, NgZone, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

/**
 * Refresca periódicamente el access token (JWT de vida corta, 2 min) contra el
 * backend usando el session token de larga vida. Así, si a un usuario le cambian
 * el rol, en a lo sumo ~2 min su token y sus features se actualizan sin que tenga
 * que cerrar sesión.
 *
 * Se arranca al entrar a la zona autenticada (Layout) y se detiene al salir.
 */
@Injectable({ providedIn: 'root' })
export class SessionRefreshService {
  /** Un poco menos que la vida del JWT (2 min) para refrescar antes de que expire. */
  private static readonly INTERVAL_MS = 100_000;

  private timerId: ReturnType<typeof setInterval> | null = null;
  private onVisible?: () => void;

  private readonly authService = inject(AuthService);
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  start(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.timerId !== null) return; // ya corriendo
    if (!this.authService.getSessionToken()) return; // sin sesión, nada que refrescar

    // Refresco inmediato al entrar/recargar la página: si te cambiaron los roles
    // mientras la pestaña estaba cerrada (sin timer ni SignalR activos), el token y
    // el sidebar reflejan los permisos actuales de una, sin esperar al primer tick.
    this.refresh();

    // Fuera de Angular para no disparar change detection en cada tick del intervalo.
    this.zone.runOutsideAngular(() => {
      this.timerId = setInterval(() => this.refresh(), SessionRefreshService.INTERVAL_MS);
    });

    // Al volver el foco a la pestaña (estuvo en segundo plano), refrescar de una.
    this.onVisible = () => {
      if (document.visibilityState === 'visible') this.refresh();
    };
    document.addEventListener('visibilitychange', this.onVisible);
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.onVisible) {
      document.removeEventListener('visibilitychange', this.onVisible);
      this.onVisible = undefined;
    }
  }

  private refresh(): void {
    if (!this.authService.getSessionToken()) return;
    // Volvemos a la zona de Angular para que la actualización de localStorage/UI
    // dispare change detection (ej. el sidebar relee allowed_features).
    this.zone.run(() => {
      this.authService.refresh().subscribe({
        next: () => {},
        // Si el refresh falla (sesión inválida/expirada), el interceptor de 401 se
        // encargará en la próxima petición; aquí no hacemos nada para no romper el timer.
        error: () => {},
      });
    });
  }
}
