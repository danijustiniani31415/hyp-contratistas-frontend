import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SectionTabs, SectionTab } from '../../../../shared/components/section-tabs/section-tabs';
import { NavigationService } from '../../../../core/navigation/navigation.service';
import { StaffProjectEmail } from './staffProjectEmail/components/staff-project-email';
import { WorkItemCategory } from './workItemCategory/components/work-item-category';
import { WorkItem } from './workItem/components/work-item';
import { WorkSpecialty } from './workSpecialty/components/work-specialty';
import { ProjectLink } from './projectLink/components/project-link';
import { AdjudicacionFolder } from './adjudicacionFolder/components/adjudicacion-folder';
import { CostosPresupuestosEmail } from './costosPresupuestosEmail/components/costos-presupuestos-email';

import { COSTS_TABS } from '../../shared/costs-tabs';
/** Definición de una sección de configuración de costos. */
interface ConfigSectionDef {
  id: string;
  label: string;
  route: string;
  featureKey: string;
}

/**
 * Contenedor de configuración de Costos y Presupuesto.
 *
 * Agrupa bajo `/costs/configuration` las pantallas de configuración
 * (correos por proyecto, partidas, especialidades, planos, carpetas, etc.)
 * conmutándolas con el componente `app-section-tabs`, siguiendo el mismo
 * patrón que `lecciones-configuracion` de Mejora Continua.
 *
 * Cada sección sigue teniendo su propia ruta (`/costs/configuration/<seccion>`)
 * con su `featureKey` + `roleGuard`, por lo que el control de acceso por
 * sección y los enlaces del sidebar se mantienen intactos. La sección activa
 * se determina a partir de `route.data.seccion`; las pestañas se filtran por
 * los features a los que el usuario tiene acceso.
 */
@Component({
  selector: 'app-costs-configuration',
  standalone: true,
  imports: [
    CommonModule,
    AbrilPageHeaderComponent,
    SectionTabs,
    StaffProjectEmail,
    WorkItemCategory,
    WorkItem,
    WorkSpecialty,
    ProjectLink,
    AdjudicacionFolder,
    CostosPresupuestosEmail,
  ],
  templateUrl: './costs-configuration.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class CostsConfiguration implements OnInit {
  readonly tabs = COSTS_TABS;
  /** Todas las secciones de configuración, en orden de visualización. */
  private readonly allSections: ConfigSectionDef[] = [
    { id: 'work-item',                 label: 'Partidas',         route: '/costs/configuration/work-item',                 featureKey: 'costs.config.work-item' },
    { id: 'work-item-category',        label: 'Partidas Control', route: '/costs/configuration/work-item-category',        featureKey: 'costs.config.work-item-category' },
    { id: 'work-specialty',            label: 'Especialidades',   route: '/costs/configuration/work-specialty',            featureKey: 'costs.config.work-specialty' },
    { id: 'staff-project-email',       label: 'Correos Proyecto', route: '/costs/configuration/staff-project-email',       featureKey: 'costs.config.staff-project-email' },
    { id: 'project-link',              label: 'Planos Proyecto',  route: '/costs/configuration/project-link',              featureKey: 'costs.config.project-link' },
    { id: 'adjudicacion-folder',       label: 'Carpeta Adj.',     route: '/costs/configuration/adjudicacion-folder',       featureKey: 'costs.config.adjudicacion-folder' },
    { id: 'costos-presupuestos-email', label: 'Correos C. Ppto.', route: '/costs/configuration/costos-presupuestos-email', featureKey: 'costs.config.costos-presupuestos-email' },
  ];

  /** Secciones a las que el usuario tiene acceso (las que se muestran como pestañas). */
  visibleSections: ConfigSectionDef[] = [];
  sectionTabs: SectionTab[] = [];
  activeSection: string | null = null;

  // Referencias a la sección activa (solo una existe a la vez por el *ngIf).
  @ViewChild(WorkItem) private workItemCmp?: WorkItem;
  @ViewChild(WorkItemCategory) private workItemCategoryCmp?: WorkItemCategory;
  @ViewChild(WorkSpecialty) private workSpecialtyCmp?: WorkSpecialty;
  @ViewChild(StaffProjectEmail) private staffProjectEmailCmp?: StaffProjectEmail;
  @ViewChild(ProjectLink) private projectLinkCmp?: ProjectLink;
  @ViewChild(AdjudicacionFolder) private adjudicacionFolderCmp?: AdjudicacionFolder;
  @ViewChild(CostosPresupuestosEmail) private costosPresupuestosEmailCmp?: CostosPresupuestosEmail;

  /** Etiqueta del botón de crear, según la sección activa. */
  private readonly createLabels: Record<string, string> = {
    'work-item': 'Nueva partida',
    'work-item-category': 'Nueva partida de control',
    'work-specialty': 'Nueva especialidad',
    'staff-project-email': 'Nuevo correo',
    'project-link': 'Nuevo plano',
    'adjudicacion-folder': 'Nueva carpeta',
    'costos-presupuestos-email': 'Nuevo correo',
  };

  get createLabel(): string {
    return (this.activeSection && this.createLabels[this.activeSection]) || 'Nuevo registro';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navigationService: NavigationService,
  ) {}

  ngOnInit(): void {
    this.visibleSections = this.allSections.filter((s) =>
      this.navigationService.isFeatureAllowed(s.featureKey),
    );
    this.sectionTabs = this.visibleSections.map((s) => ({ id: s.id, label: s.label }));

    this.route.data.subscribe((data) => {
      const seccion = (data['seccion'] as string | null | undefined) ?? null;

      // Ruta contenedora sin sección concreta: redirigir a la primera permitida.
      if (!seccion) {
        if (this.visibleSections.length) {
          this.router.navigate([this.visibleSections[0].route], { replaceUrl: true });
        } else {
          this.router.navigate(['/']);
        }
        return;
      }

      this.activeSection = seccion;
    });
  }

  onSectionChange(id: string): void {
    const target = this.visibleSections.find((s) => s.id === id);
    if (target) this.router.navigate([target.route]);
  }

  /** Abre el modal de creación de la sección activa (botón del header). */
  onCreate(): void {
    switch (this.activeSection) {
      case 'work-item': this.workItemCmp?.openCreate(); break;
      case 'work-item-category': this.workItemCategoryCmp?.openCreate(); break;
      case 'work-specialty': this.workSpecialtyCmp?.openCreate(); break;
      case 'staff-project-email': this.staffProjectEmailCmp?.openCreate(); break;
      case 'project-link': this.projectLinkCmp?.openCreate(); break;
      case 'adjudicacion-folder': this.adjudicacionFolderCmp?.openCreate(); break;
      case 'costos-presupuestos-email': this.costosPresupuestosEmailCmp?.openCreate(); break;
    }
  }
}
