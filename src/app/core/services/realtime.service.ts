import { Injectable, NgZone, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Conexión en tiempo real (SignalR) para recibir avisos de "refresca tu sesión"
 * cuando un admin cambia los roles del usuario o las funcionalidades de su rol.
 * Al recibir el evento, refresca el token al instante reusando AuthService.refresh().
 *
 * Es la vía rápida; el timer de SessionRefreshService sigue como red de seguridad
 * por si la conexión se cae o el evento se pierde.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private connection: HubConnection | null = null;

  private readonly authService = inject(AuthService);
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  start(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.connection) return; // ya iniciado
    if (!this.authService.getToken()) return; // sin sesión, no conectar

    this.zone.runOutsideAngular(() => {
      const connection = new HubConnectionBuilder()
        .withUrl(`${environment.apiUrl}hubs/notifications`, {
          // El JWT viaja por query string (?access_token=...); se relee fresco en
          // cada (re)conexión, así que tras un refresh la reconexión usa el vigente.
          accessTokenFactory: () => this.authService.getToken() ?? '',
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build();

      connection.on('refreshSession', () => {
        // Volver a la zona de Angular para que la actualización de permisos dispare
        // change detection (ej. el sidebar relee allowed_features).
        this.zone.run(() => {
          this.authService.refresh().subscribe({ next: () => {}, error: () => {} });
        });
      });

      this.connection = connection;
      connection.start().catch(() => {
        // Si falla la conexión inicial no rompemos nada: el timer cubre el refresh.
        this.connection = null;
      });
    });
  }

  stop(): void {
    if (this.connection) {
      this.connection.stop().catch(() => {});
      this.connection = null;
    }
  }
}
