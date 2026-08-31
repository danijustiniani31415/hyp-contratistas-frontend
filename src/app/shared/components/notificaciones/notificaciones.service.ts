import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ErrorService } from '../../../core/services/error.service';
import { Notificaciones, NotificacionItem } from './notificaciones.dto';

/**
 * Estado y API de la campanita de notificaciones del encabezado. Singleton (providedIn root):
 * el estado sobrevive a la navegación entre páginas, así el contador no se re-consulta en cada
 * cambio de ruta — solo en la primera carga y al abrir el panel (refresco explícito).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/notificaciones`;

  /** Contador del badge rojo de la campanita. */
  noLeidas = 0;
  /** Últimas notificaciones del usuario (las del panel). */
  notificaciones: NotificacionItem[] = [];

  private cargado = false;

  constructor(
    private http: HttpClient,
    private errorService: ErrorService,
  ) {}

  private get token(): string | null {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  /**
   * Carga contador + lista en una sola petición. Sin `force` solo consulta la primera vez
   * (la campanita se monta en cada página); con `force` refresca (al abrir el panel).
   * Los errores de esta carga en segundo plano son silenciosos: no deben interrumpir la página.
   */
  cargar(force = false): void {
    if (!this.token) return;
    if (this.cargado && !force) return;

    this.http.get<Notificaciones>(this.apiUrl, { headers: this.headers }).subscribe({
      next: (data) => {
        this.noLeidas = data.noLeidas;
        this.notificaciones = data.notificaciones;
        this.cargado = true;
      },
      error: () => {}, // silencioso: carga de fondo, la página sigue funcionando sin campanita
    });
  }

  /** Marca una notificación como leída ("apaga sus colores"), de forma optimista. */
  marcarLeida(n: NotificacionItem): void {
    if (n.leida) return;

    n.leida = true;
    this.noLeidas = Math.max(0, this.noLeidas - 1);

    this.http.patch(`${this.apiUrl}/${n.id}/leida`, {}, { headers: this.headers }).subscribe({
      error: (err: HttpErrorResponse) => {
        n.leida = false;
        this.noLeidas++;
        this.errorService.handleError(err);
      },
    });
  }

  /** Marca todas las no leídas como leídas, de forma optimista. */
  marcarTodasLeidas(): void {
    if (this.noLeidas === 0) return;

    const antes = this.notificaciones.filter((n) => !n.leida);
    const noLeidasAntes = this.noLeidas;
    for (const n of antes) n.leida = true;
    this.noLeidas = 0;

    this.http.patch(`${this.apiUrl}/leidas`, {}, { headers: this.headers }).subscribe({
      error: (err: HttpErrorResponse) => {
        for (const n of antes) n.leida = false;
        this.noLeidas = noLeidasAntes;
        this.errorService.handleError(err);
      },
    });
  }
}
