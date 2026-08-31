import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../../../shared/components/section-tabs/section-tabs';
import { NavigationService } from '../../../../../core/navigation/navigation.service';
import { LessonAreas } from '../lesson-areas/lesson-areas';
import { Areas } from '../areas-subareas/components/areas';
import { Templates } from '../templates/components/templates';
import { CatalogTypes } from '../catalog-types/catalog-types';
import { CatalogItems } from '../catalog-items/catalog-items';

import { MEJORA_CONTINUA_TABS } from '../../../shared/mejora-continua-tabs';
type ConfigSection = 'areas' | 'area-relations' | 'templates' | 'catalog-types' | 'catalog-items';

/**
 * Contenedor de configuración de lecciones aprendidas.
 *
 * Agrupa en una sola ruta (`mejora-continua/lecciones-configuracion`) las
 * pantallas que antes vivían en rutas separadas (`configuration/areas`,
 * `area-relations`, `templates`, `catalog-types`, `catalog-items`),
 * conmutándolas por secciones con el mismo patrón que `lesson-reminders`.
 *
 * La sección activa se sincroniza con el query param `?seccion=` para
 * permitir enlaces directos a una sección concreta.
 */
@Component({
  selector: 'app-lecciones-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    SectionTabs,
    LessonAreas,
    Areas,
    Templates,
    CatalogTypes,
    CatalogItems,
    AbrilPageHeaderComponent,
  ],
  templateUrl: './lecciones-configuracion.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class LeccionesConfiguracion implements OnInit {
  readonly tabs = MEJORA_CONTINUA_TABS;
  anioActual = new Date().getFullYear();
  activeSection: ConfigSection = 'areas';

  private readonly nav = inject(NavigationService);

  /** featureKey que gobierna cada sección (coincide con el roleGuard de su ruta
   *  individual en mejora-continua.routes.ts). */
  private readonly sectionFeatureKey: Record<ConfigSection, string> = {
    'areas': 'mejora-continua.config.areas',
    'area-relations': 'mejora-continua.config.area-relations',
    'templates': 'mejora-continua.config.templates',
    'catalog-types': 'mejora-continua.config.catalog-types',
    'catalog-items': 'mejora-continua.config.catalog-items',
  };

  private readonly allSectionTabs: SectionTab[] = [
    { id: 'areas', label: 'Áreas' },
    { id: 'area-relations', label: 'Relaciones por área' },
    { id: 'templates', label: 'Plantillas' },
    { id: 'catalog-types', label: 'Tipos de catálogo' },
    { id: 'catalog-items', label: 'Ítems de catálogo' },
  ];

  /** La feature paraguas (`lecciones-configuracion`) da acceso a TODAS las
   *  secciones (comportamiento previo); sin ella, se muestran solo las secciones
   *  cuya sub-feature tiene el usuario. */
  private get tieneParaguas(): boolean {
    return this.nav.isFeatureAllowed('mejora-continua.config.lecciones-configuracion');
  }

  /** Secciones visibles según el acceso del usuario (fuente para el section-tabs). */
  get sectionTabs(): SectionTab[] {
    const paraguas = this.tieneParaguas;
    return this.allSectionTabs.filter(
      (t) => paraguas || this.nav.isFeatureAllowed(this.sectionFeatureKey[t.id as ConfigSection]),
    );
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Solo se puede activar una sección a la que el usuario tenga acceso; si el
    // query param apunta a una no permitida (o no viene), cae a la primera visible.
    const visibles = this.sectionTabs.map((t) => t.id) as ConfigSection[];
    const seccion = this.route.snapshot.queryParamMap.get('seccion');
    this.activeSection =
      seccion && visibles.includes(seccion as ConfigSection)
        ? (seccion as ConfigSection)
        : (visibles[0] ?? 'areas');
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
