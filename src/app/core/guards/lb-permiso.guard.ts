import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { LbAuthService } from '../services/lb-auth.service';

/**
 * Segunda capa de defensa además del backend (que ya rechaza con 403): sin esto, cualquier
 * usuario logueado en Las Bravas podía navegar directo a la URL de un módulo sin tener el
 * permiso, aunque el link no apareciera en el nav. `data.lbPermisos` es la lista de códigos
 * aceptados para esa ruta — basta con tener uno.
 */
export const lbPermisoGuard: CanActivateFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(LbAuthService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) return true;

  const permisos = route.data?.['lbPermisos'] as string[] | undefined;
  if (!permisos?.length) return true;

  if (permisos.some((codigo) => authService.hasPermiso(codigo))) return true;

  router.navigate(['/personas']);
  return false;
};
