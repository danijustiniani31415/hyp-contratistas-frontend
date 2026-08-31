import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../../shared/components/section-tabs/section-tabs';
import { InvoiceFolder } from './invoiceFolder/components/invoice-folder';
import { FirmaPersonal } from '../../../../shared/components/firma-personal/firma-personal';

import { CONTABILIDAD_TABS } from '../../shared/contabilidad-tabs';
type ConfigSection = 'carpeta-facturas' | 'firma-gg';

/**
 * Contenedor de configuración de Contabilidad. Agrupa en una sola ruta
 * (`contabilidad/configuracion`) las subsecciones de configuración,
 * conmutándolas con el mismo patrón que la Configuración de Mejora Continua.
 *
 * La sección activa se sincroniza con el query param `?seccion=`.
 */
@Component({
  selector: 'app-contabilidad-configuracion',
  standalone: true,
  imports: [CommonModule, SectionTabs, InvoiceFolder, FirmaPersonal, AbrilPageHeaderComponent],
  templateUrl: './contabilidad-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class ContabilidadConfiguracion implements OnInit {
  readonly tabs = CONTABILIDAD_TABS;
  anioActual = new Date().getFullYear();
  activeSection: ConfigSection = 'carpeta-facturas';

  readonly sectionTabs: SectionTab[] = [
    { id: 'carpeta-facturas', label: 'Carpeta facturas' },
    { id: 'firma-gg', label: 'Firma' },
  ];

  private readonly validSections = this.sectionTabs.map((t) => t.id);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const seccion = this.route.snapshot.queryParamMap.get('seccion');
    if (seccion && this.validSections.includes(seccion)) {
      this.activeSection = seccion as ConfigSection;
    }
  }

  onSectionChange(id: string): void {
    this.activeSection = id as ConfigSection;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { seccion: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
