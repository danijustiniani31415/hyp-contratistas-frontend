import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { GthCorreosConfig } from '../../shared/correos-config/correos-config';

/**
 * Contenedor de la Configuración de correos de Solicitud de Personal.
 *
 * Acceso restringido por la feature 'gestion-gth.reclutamiento.configuracion' (roleGuard en la
 * ruta), la misma que ya habilitaba el botón «Configuración» de la pantalla. El contenido lo
 * arma `app-gth-correos-config`, que trae los correos del flujo desde el backend y los pinta
 * como secciones — las pestañas salen de los datos, no de una lista escrita acá.
 */
@Component({
  standalone: true,
  selector: 'app-gth-solicitud-personal-configuracion',
  imports: [CommonModule, AbrilPageHeaderComponent, GthCorreosConfig],
  templateUrl: './solicitud-personal-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class GthSolicitudPersonalConfiguracion {
  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/gestion-gth/solicitud-personal']);
  }
}
