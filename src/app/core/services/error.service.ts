import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { LoaderService } from './loader.service';
import { ReturnUrlService } from '../auth/return-url.service';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  constructor(
    private router: Router,
    private loaderService: LoaderService,
    private returnUrlService: ReturnUrlService,
  ) {}

  handleError(err: HttpErrorResponse) {

    this.loaderService.hide();

    if (err.status === 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: err.error?.message ?? '',
      });

      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('allowed_features');
      localStorage.removeItem('contratista_scope');
      localStorage.removeItem('contratista_proyectos');
      localStorage.removeItem('session_token');
      // Se lleva a dónde estaba: al volver a iniciar sesión regresa a esa misma
      // pantalla en vez de aterrizar en el landing por defecto.
      this.returnUrlService.goToLogin(this.router.url);
      return;
    }

    // 422 — falta configuración (p. ej. correos de staff no asociados al proyecto).
    // Se muestra como advertencia para que el usuario no lo confunda con un error del sistema.
    if (err.status === 422) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta configuración',
        text: err.error?.message ?? 'Falta completar una configuración para continuar.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    // 4xx — el backend rechazó la acción a propósito (validación, permisos, conflicto…). No es una
    // falla del sistema: el mensaje ya viene explicado desde el backend (AbrilException) y el usuario
    // puede corregirlo. Se muestra como advertencia (ícono naranja + botón verde) para que no lo
    // confunda con un error grave. El ícono rojo de "Error" se reserva para fallas reales (5xx).
    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: err.error?.message ?? 'No se pudo completar la acción.',
        confirmButtonColor: '#64BC04',
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
    }
  }
}