import { RedirectFunction } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

/**
 * Redirección de la raíz `/` (solo `/` exacto, por `pathMatch: 'full'`):
 * - Con sesión válida → `/boletin` (portada Vive Abril).
 * - Sin sesión, o con token vencido → `/auth/login`.
 *
 * Entrar directo a `/boletin` sin sesión sigue permitido: eso lo decide el
 * `boletinGuard` (portada pública), no esta redirección. Aquí solo cambiamos a
 * dónde cae quien llega a la raíz.
 */
export const rootRedirect: RedirectFunction = () => {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  // En SSR no hay localStorage; mantener la portada como landing por defecto.
  if (!isPlatformBrowser(platformId)) return '/boletin';

  const token = authService.getToken();
  return token && !authService.isTokenExpired() ? '/boletin' : '/auth/login';
};
