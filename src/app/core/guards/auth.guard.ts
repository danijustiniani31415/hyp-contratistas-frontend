import { CanActivateFn } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ReturnUrlService } from '../auth/return-url.service';

export const authGuard: CanActivateFn = (_route, state) => {

  const authService = inject(AuthService);
  const returnUrlService = inject(ReturnUrlService);
  const platformId = inject(PLATFORM_ID);

  // Si estamos en el servidor (SSR)
  //comentar si se requiere ssr
  //esto de abajo soluciono  el problema de que no se podia actualizar
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  // hasta aca nomas

  const token = localStorage.getItem('access_token');

  // Sin sesión (o vencida) se va al login PERO llevando a dónde iba: al entrar,
  // el login lo devuelve a esa URL en vez de al landing por defecto. Es lo que
  // hace que los enlaces profundos de los correos (p. ej. el de aprobación de
  // Gerencia) sigan llegando a su destino.
  if (!token) {
    return returnUrlService.loginRedirect(state.url);
  }

  if (authService.isTokenExpired()) {
    authService.logout();
    return returnUrlService.loginRedirect(state.url);
  }

  return true;
};
