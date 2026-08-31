import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SSOMA_TABS } from '../../shared/salud-ocupacional-tabs';
import { EmoCorreosConfigComponent } from './correos/emo-correos-config.component';

/**
 * Contenedor de la Configuración de EMOs.
 *
 * Acceso restringido por la feature 'ssoma.salud-ocupacional.emos.configuracion'
 * (roleGuard en la ruta). El contenido lo arma `app-emo-correos-config`, que trae
 * los 4 correos de EMO desde el backend y los pinta como secciones — las pestañas
 * salen de los datos, no de una lista escrita acá.
 */
@Component({
  selector: 'app-emos-configuracion',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent, EmoCorreosConfigComponent],
  templateUrl: './emos-configuracion.component.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class EmosConfiguracionComponent {
  readonly tabs = SSOMA_TABS;

  constructor(private router: Router) {}

  volver(): void {
    this.router.navigate(['/ssoma/salud-ocupacional/emos']);
  }
}
