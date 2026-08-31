import { Injectable, inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';

/** Nombre del query param que lleva la URL pendiente hasta el login. */
export const RETURN_URL_PARAM = 'returnUrl';

/**
 * "Vuelve a donde ibas" tras iniciar sesión — comportamiento GLOBAL de la app, no
 * de una funcionalidad puntual.
 *
 * Antes, cualquier enlace profundo (el correo de aprobación de Gerencia, un enlace
 * compartido por chat, un bookmark) terminaba en `/boletin` si la sesión había
 * vencido: el usuario tenía que volver a buscar a mano lo que iba a ver. Ahora el
 * guard manda al login con la URL pendiente en `?returnUrl=` y el login navega ahí
 * al entrar.
 *
 * Va por query param y no por localStorage a propósito: sobrevive al refresco de la
 * página de login, es visible/depurable, y no deja basura pegada si el usuario
 * abandona el login a medias.
 */
@Injectable({ providedIn: 'root' })
export class ReturnUrlService {
  private readonly router = inject(Router);

  /**
   * UrlTree del login con la URL pendiente adjunta. Devolver un UrlTree (en vez de
   * llamar a `router.navigate`) es lo que corresponde en un guard: cancela la
   * navegación actual y redirige en un solo paso, sin carreras.
   */
  loginRedirect(attemptedUrl: string | null | undefined): UrlTree {
    const returnUrl = this.sanitize(attemptedUrl);
    return this.router.createUrlTree(
      ['/auth/login'],
      returnUrl ? { queryParams: { [RETURN_URL_PARAM]: returnUrl } } : {},
    );
  }

  /** Manda al login conservando la URL actual. Para código fuera de un guard (p. ej. un 401). */
  goToLogin(attemptedUrl?: string | null): void {
    this.router.navigateByUrl(this.loginRedirect(attemptedUrl ?? this.router.url));
  }

  /**
   * A dónde ir después de iniciar sesión: la URL pendiente si la hay y es válida, o
   * el landing que le corresponda a ese tipo de sesión.
   */
  navigateAfterLogin(returnUrlCrudo: string | null | undefined, landingPorDefecto: string): void {
    const destino = this.sanitize(returnUrlCrudo) ?? landingPorDefecto;
    this.router.navigateByUrl(destino);
  }

  /**
   * Acepta solo rutas internas de la app. Descarta:
   *  - URLs absolutas y protocol-relative (`//otro.com`, `https://…`, `javascript:…`),
   *    que convertirían el login en un open redirect hacia un sitio externo;
   *  - las propias rutas de `/auth`, que dejarían al usuario dando vueltas en el login.
   */
  private sanitize(raw: string | null | undefined): string | null {
    const url = raw?.trim();
    if (!url) return null;
    if (!url.startsWith('/')) return null;
    if (url.startsWith('//') || url.startsWith('/\\')) return null;
    if (url === '/' || url.startsWith('/auth')) return null;
    return url;
  }
}
