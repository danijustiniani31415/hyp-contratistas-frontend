import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { LbAuthService } from '../services/lb-auth.service';

/** Guard de las pantallas reales de Las Bravas — sesión propia, no la de Abril. */
export const lbAuthGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(LbAuthService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) return true;

  if (authService.getToken() && !authService.isTokenExpired()) return true;

  router.navigate(['/login']);
  return false;
};
