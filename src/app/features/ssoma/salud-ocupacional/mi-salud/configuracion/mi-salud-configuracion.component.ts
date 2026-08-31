import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { SSOMA_TABS } from '../../shared/salud-ocupacional-tabs';
import { CorreosNotificacionComponent } from './correos/correos-notificacion.component';

/**
 * Contenedor de la Configuración de Mi Salud.
 *
 * Acceso restringido por la feature 'ssoma.salud-ocupacional.mi-salud.configuracion'
 * (roleGuard en la ruta). Usa `app-section-tabs` para conmutar entre secciones;
 * por ahora existe una sola sección: activar/inactivar los correos que se envían
 * al registrar un descanso médico.
 */
@Component({
  selector: 'app-mi-salud-configuracion',
  standalone: true,
  imports: [CommonModule, AbrilPageHeaderComponent, SectionTabs, CorreosNotificacionComponent],
  templateUrl: './mi-salud-configuracion.component.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class MiSaludConfiguracionComponent {
  readonly tabs = SSOMA_TABS;
  readonly sectionTabs: SectionTab[] = [
    { id: 'correos', label: 'Correos de descanso médico' },
  ];
  activeSection = 'correos';

  constructor(private router: Router) {}

  onSectionChange(id: string): void {
    this.activeSection = id;
  }

  volver(): void {
    this.router.navigate(['/ssoma/salud-ocupacional/mi-salud']);
  }
}
