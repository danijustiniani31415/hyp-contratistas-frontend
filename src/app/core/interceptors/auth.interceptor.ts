import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { RefreshResponseDTO } from '../dtos/auth/login-response.model';

/** Endpoints de autenticación: no se les intenta refresh (evita bucles). */
function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/microsoft/login');
}

/** Endpoints públicos que no requieren token — sin este check se dispara CORS preflight innecesario. */
function isPublicEndpoint(url: string): boolean {
  return url.includes('/shared-filters/');
}

/**
 * Refresh compartido entre peticiones: si varias requests reciben 401 a la vez,
 * todas esperan el mismo refresh en vuelo en lugar de disparar uno cada una.
 */
let refreshInFlight$: Observable<RefreshResponseDTO> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;

  const authReq =
    token && !req.headers.has('Authorization') && !isPublicEndpoint(req.url)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Solo intentamos refrescar cuando: es 401, hay session token (usuarios de la
      // empresa; contratistas/clínica no tienen y se dejan pasar tal cual) y no es
      // un endpoint de auth.
      const canRefresh =
        err.status === 401 &&
        !!authService.getSessionToken() &&
        !isAuthEndpoint(authReq.url);

      if (!canRefresh) {
        return throwError(() => err);
      }

      if (!refreshInFlight$) {
        refreshInFlight$ = authService.refresh();
      }

      return refreshInFlight$.pipe(
        switchMap((res) => {
          refreshInFlight$ = null;
          // Reintentar la petición original con el token nuevo.
          const retried = req.clone({
            setHeaders: { Authorization: `Bearer ${res.accessToken}` },
          });
          return next(retried);
        }),
        catchError((refreshErr) => {
          refreshInFlight$ = null;
          // El refresh falló: sesión inválida/expirada → cerrar sesión.
          authService.logout();
          router.navigate(['/auth/login']);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
