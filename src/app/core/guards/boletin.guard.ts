import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

/**
 * Protege `/boletin`: es la portada pública de Abril (landing de `/`), así que
 * también la ven visitantes sin sesión y contratistas logueados (solo la
 * portada, sin VAMOS ni el contenido del boletín — eso lo decide
 * `Boletin.puedeVerBoletin`). Otros usuarios logueados (p. ej. CLINICA o staff
 * sin rol `USUARIO DE ABRIL`) se redirigen a su landing real, NUNCA a `/`
 * (que redirige de vuelta a `/boletin` y crearía un loop).
 */
export const boletinGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true;

  const token = authService.getToken();
  if (!token) return true;

  if (authService.esUsuarioAbrilBoletin()) return true;
  if (authService.isContratista()) return true;

  router.navigate([authService.isClinica() ? '/clinica/agenda' : '/inicio']);
  return false;
};
