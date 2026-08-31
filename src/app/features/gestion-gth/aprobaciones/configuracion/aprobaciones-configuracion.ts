import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { GthCorreosConfig } from '../../shared/correos-config/correos-config';

/**
 * Contenedor de la Configuración de correos de Aprobaciones: los avisos que salen cuando se decide
 * una solicitud de personal — los de GTH, que arrancan el reclutamiento (uno por lo que aprueba
 * Gerencia General y otro por los reemplazos que juntan las firmas del gerente del área y de GTH),
 * y el de TI, que le da la anticipación para alistar equipo y accesos de cada ingreso. Ninguno lo
 * dispara el solicitante sino una decisión que se toma en esta pantalla, por eso se configuran acá.
 *
 * Acceso restringido por la feature 'gestion-gth.reclutamiento.configuracion' (roleGuard en la
 * ruta), la misma que habilita las otras dos configuraciones de correos de Gestión GTH: quien
 * administra los correos del módulo los administra todos. El contenido lo arma
 * `app-gth-correos-config`, compartido con esas dos pantallas: las secciones salen de los correos
 * que el backend asocia a este módulo, no de una lista escrita acá.
 */
@Component({
  standalone: true,
  selector: 'app-gth-aprobaciones-configuracion',
  imports: [CommonModule, AbrilPageHeaderComponent, GthCorreosConfig],
  templateUrl: './aprobaciones-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GthAprobacionesConfiguracion {
  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/gestion-gth/aprobaciones']);
  }
}
