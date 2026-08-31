import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavigationService } from '../../../../../core/navigation/navigation.service';
import { Roles } from '../../../../../core/constants/roles';

export interface BimSubTab {
  label: string;
  icon: string;
  route: string;
  featureKey?: string;
  roles?: string[];
}

@Component({
  selector: 'app-planeamiento-bim-subnav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './planeamiento-bim-subnav.html',
  styleUrl: './planeamiento-bim-subnav.css',
})
export class PlaneamientoBimSubnavComponent {
  private navService = inject(NavigationService);

  readonly allTabs: BimSubTab[] = [
    {
      label: 'Configuración Inicial',
      icon: 'ti ti-settings',
      route: '/projects/planeamiento-bim/configuracion-inicial',
      featureKey: 'planeamiento-bim.configuracion-inicial',
    },
    {
      label: 'Carga Diaria',
      icon: 'ti ti-calendar-stats',
      route: '/projects/planeamiento-bim/carga-diaria',
      featureKey: 'planeamiento-bim.configuracion-inicial',
    },
    {
      label: 'Restricciones',
      icon: 'ti ti-barrier-block',
      route: '/projects/planeamiento-bim/restricciones',
      featureKey: 'planeamiento-bim.configuracion-inicial',
    },
    {
      label: 'Dashboard',
      icon: 'ti ti-chart-infographic',
      route: '/projects/planeamiento-bim/dashboard',
      featureKey: 'planeamiento-bim.configuracion-inicial',
    },
    {
      label: 'Portafolio',
      icon: 'ti ti-chart-donut-3',
      route: '/projects/planeamiento-bim/portafolio',
      featureKey: 'planeamiento-bim.portafolio',
      roles: [Roles.ADMINISTRADOR_SISTEMA, Roles.ADMINISTRADOR_UDP],
    },
  ];

  get subTabs(): BimSubTab[] {
    return this.allTabs.filter((tab) => this.navService.isNavEntryAllowed(tab));
  }
}
