import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { RoleFeatureService } from '../../services/role.service';
import { RoleDto } from '../../dtos/role.model';
import { FeatureDto } from '../../dtos/feature.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { FEATURE_DISPLAY_NAMES } from '../../../../../../core/navigation/feature-display-names.generated';
import Swal from 'sweetalert2';

interface FeatureItem extends FeatureDto {
  checked: boolean;
  /** Nombre legible derivado del featureKey (solo presentación, ver humanizeFeatureKey). */
  label: string;
}

interface ModuleOption {
  moduleId: number;
  moduleName: string;
}

interface ModuleGroup {
  moduleId: number | null;
  moduleName: string;
  /** Todos los ítems del módulo, sin filtrar por búsqueda (para el contador del header). */
  allItems: FeatureItem[];
  /** Ítems del módulo que además pasan el buscador (para renderizar filas). */
  items: FeatureItem[];
}

const ACRONYMS: Record<string, string> = {
  bim: 'BIM', gth: 'GTH', ivt: 'IVT', ssoma: 'SSOMA', rac: 'RAC', opt: 'OPT',
  sctr: 'SCTR', ats: 'ATS', emos: 'EMOs',
};

const WORD_OVERRIDES: Record<string, string> = {
  area: 'Área', areas: 'Áreas', auditoria: 'Auditoría',
  categoria: 'Categoría', categorias: 'Categorías',
  catalogo: 'Catálogo', catalogos: 'Catálogos',
  clinica: 'Clínica', clinicas: 'Clínicas',
  item: 'Ítem', items: 'Ítems',
  topico: 'Tópico', topicos: 'Tópicos',
  vidaley: 'Vida Ley',
};

/** feature_key mezcla claves en español (sin tildes, ej. "configuracion") con claves
 *  legacy en inglés (ej. "configuration", "construction") — ambas terminan en "-ion",
 *  así que hay que excluir las inglesas conocidas para no acentuarlas por error
 *  (bug real detectado al probar contra los 156 featureKey reales: "configuration"
 *  se convertía en "Configuratión"). */
const ENGLISH_WORDS = new Set([
  'accounting', 'category', 'companies', 'company', 'config', 'configuration', 'construction',
  'contractors', 'costs', 'invoices', 'learned', 'lessons', 'link', 'logbook', 'management',
  'measurement', 'milestone', 'milestones', 'monitoring', 'onboarding', 'project', 'projects',
  'reminders', 'report', 'resident', 'response', 'schedule', 'security', 'specialty', 'staff',
  'users', 'work', 'workers', 'folder', 'email', 'checklist', 'gantt', 'dossier',
]);

function humanizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (ACRONYMS[lower]) return ACRONYMS[lower];
  if (WORD_OVERRIDES[lower]) return WORD_OVERRIDES[lower];
  let fixed = lower;
  // Palabras en español tipo "configuracion"/"gestion"/"revision" pierden la tilde al
  // convertirse en slug — se restituye salvo que sea un plural en "-iones" (no lleva
  // tilde, ej. "evaluaciones") o una palabra inglesa conocida (ej. "configuration").
  if (!ENGLISH_WORDS.has(lower) && /ion$/.test(fixed) && !/iones$/.test(fixed)) {
    fixed = fixed.slice(0, -2) + 'ón';
  }
  return fixed.charAt(0).toUpperCase() + fixed.slice(1);
}

function humanizeSegment(segment: string): string {
  return segment.split('-').map(humanizeWord).join(' ');
}

/** Traduce un feature_key técnico (ej. "planeamiento-bim.configuracion-inicial") a un
 *  nombre legible ("Configuración Inicial"). El primer segmento (prefijo de dominio) se
 *  descarta porque ya está representado por el nombre del módulo/grupo; los segmentos
 *  restantes (para claves anidadas, ej. "ssoma.gestion.rac.crear") se unen con "›" a
 *  modo de breadcrumb. Es solo presentación — el featureKey real se sigue mostrando
 *  como texto secundario en cada fila para no perder trazabilidad de debugging.
 *
 *  Es el ÚLTIMO fallback (ver `displayName()`): un featureKey solo cae acá cuando no
 *  aparece ni en el sidebar (navigation.service.ts) ni en ningún route.data.titulo del
 *  resto de la app — ej. permisos finos sin pantalla propia como
 *  "arquitectura-comercial.observaciones.editar", o las pantallas de RAC/OPT/Inspección
 *  que no declaran titulo. Un nombre generado es mejor que nada, pero debe ser la
 *  excepción: si esto se usa para un featureKey que SÍ tiene label/titulo real en la
 *  app, `scripts/generate-feature-display-names.js` está desactualizado — correrlo de
 *  nuevo. */
export function humanizeFeatureKey(featureKey: string): string {
  const parts = featureKey.split('.');
  const rest = parts.length > 1 ? parts.slice(1) : parts;
  return rest.map(humanizeSegment).join(' › ');
}

/** Nombre a mostrar para un featureKey: prioriza el texto real ya usado en la app
 *  (`FEATURE_DISPLAY_NAMES`, generado desde navigation.service.ts + route.data.titulo —
 *  ver scripts/generate-feature-display-names.js) y solo genera un nombre heurístico
 *  cuando el featureKey no aparece en ningún lado del frontend. */
export function displayName(featureKey: string): string {
  return FEATURE_DISPLAY_NAMES[featureKey] ?? humanizeFeatureKey(featureKey);
}

const SIN_MODULO = 'Sin módulo asignado';

@Component({
  selector: 'app-role-edit',
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './role-edit.html',
  styleUrl: './role-edit.css',
})
export class RoleEdit implements OnInit {
  @Input() role!: RoleDto;
  @Output() closeModal = new EventEmitter<void>();
  @Output() roleUpdated = new EventEmitter<void>();

  editedDescription = '';

  features: FeatureItem[] = [];
  modules: ModuleOption[] = [];
  groups: ModuleGroup[] = [];
  searchTerm = '';
  selectedModuleId: number | null = null;
  loading = true;

  /** Módulos con el acordeón abierto. Se auto-expanden al cargar los que ya tengan
   *  algún ítem marcado, para que el admin vea de entrada qué tiene asignado el rol. */
  private expandedModuleIds = new Set<number | null>();

  constructor(
    private roleService: RoleFeatureService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.editedDescription = this.role.roleDescription;
    this.loaderService.show();
    forkJoin({
      all: this.roleService.getAllFeatures(),
      assigned: this.roleService.getRoleFeatureIds(this.role.roleId),
    }).subscribe({
      next: ({ all, assigned }) => {
        const assignedSet = new Set(assigned);
        this.features = all.map((f) => ({
          ...f,
          checked: assignedSet.has(f.featureId),
          label: displayName(f.featureKey),
        }));
        this.modules = this.buildModules();
        this.groups = this.buildGroups();
        this.expandedModuleIds = new Set(
          this.groups.filter((g) => g.allItems.some((i) => i.checked)).map((g) => g.moduleId),
        );
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  private buildModules(): ModuleOption[] {
    const seen = new Set<number>();
    const result: ModuleOption[] = [];
    for (const f of this.features) {
      if (f.moduleId != null && !seen.has(f.moduleId)) {
        seen.add(f.moduleId);
        result.push({ moduleId: f.moduleId, moduleName: f.moduleName ?? '' });
      }
    }
    return result;
  }

  /** Agrupa `features` por módulo, preservando el orden de aparición de la API.
   *  Los featureKey sin moduleId (huérfanos en BD, ej. "ssoma.gestion.opt.*") caen en
   *  un grupo "Sin módulo asignado" al final, en vez de perderse o forzarlos a un
   *  módulo real que no les corresponde. */
  private buildGroups(): ModuleGroup[] {
    const order: (number | null)[] = [];
    const byModule = new Map<number | null, ModuleGroup>();
    for (const f of this.features) {
      const key = f.moduleId ?? null;
      if (!byModule.has(key)) {
        order.push(key);
        byModule.set(key, {
          moduleId: key,
          moduleName: key === null ? SIN_MODULO : (f.moduleName ?? ''),
          allItems: [],
          items: [],
        });
      }
      byModule.get(key)!.allItems.push(f);
    }
    // "Sin módulo asignado" siempre al final, sin importar en qué posición apareció.
    order.sort((a, b) => (a === null ? 1 : 0) - (b === null ? 1 : 0));
    return order.map((key) => byModule.get(key)!);
  }

  /** Grupos visibles según el pill de módulo activo y el buscador (por nombre legible
   *  o por featureKey crudo). El contador de cada header usa `allItems` (estable, no
   *  afectado por la búsqueda); las filas renderizadas usan `items` (filtradas). */
  get visibleGroups(): ModuleGroup[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.groups
      .filter((g) => this.selectedModuleId === null || g.moduleId === this.selectedModuleId)
      .map((g) => ({
        ...g,
        items: term
          ? g.allItems.filter(
              (f) => f.label.toLowerCase().includes(term) || f.featureKey.toLowerCase().includes(term),
            )
          : g.allItems,
      }))
      .filter((g) => g.items.length > 0);
  }

  /** Un grupo se ve expandido si el usuario lo abrió manualmente, o temporalmente
   *  mientras hay un filtro activo (pill de módulo único, o texto de búsqueda) que ya
   *  reduce lo que se muestra — forzar el acordeón abierto ahí evita un doble clic. */
  isExpanded(group: ModuleGroup): boolean {
    if (this.selectedModuleId !== null) return true;
    if (this.searchTerm.trim()) return true;
    return this.expandedModuleIds.has(group.moduleId);
  }

  toggleExpand(moduleId: number | null): void {
    if (this.expandedModuleIds.has(moduleId)) this.expandedModuleIds.delete(moduleId);
    else this.expandedModuleIds.add(moduleId);
  }

  get filteredFeatures(): FeatureItem[] {
    return this.visibleGroups.flatMap((g) => g.items);
  }

  get checkedCount(): number {
    return this.features.filter((f) => f.checked).length;
  }

  groupCheckedCount(group: ModuleGroup): number {
    return group.allItems.filter((f) => f.checked).length;
  }

  trackByModuleId(_: number, m: ModuleOption): number {
    return m.moduleId;
  }

  trackByGroupId(_: number, g: ModuleGroup): number | null {
    return g.moduleId;
  }

  trackByFeatureId(_: number, f: FeatureItem): number {
    return f.featureId;
  }

  toggleAll(checked: boolean) {
    this.filteredFeatures.forEach((f) => (f.checked = checked));
  }

  allFeaturesChecked(): boolean { return this.filteredFeatures.length > 0 && this.filteredFeatures.every(f => f.checked); }
  someFeaturesChecked(): boolean { return this.filteredFeatures.some(f => f.checked) && !this.allFeaturesChecked(); }

  moduleAllChecked(group: ModuleGroup): boolean {
    return group.items.length > 0 && group.items.every((f) => f.checked);
  }

  moduleSomeChecked(group: ModuleGroup): boolean {
    return group.items.some((f) => f.checked) && !this.moduleAllChecked(group);
  }

  toggleModule(group: ModuleGroup, checked: boolean): void {
    group.items.forEach((f) => (f.checked = checked));
  }

  save() {
    const trimmed = this.editedDescription.trim();
    if (!trimmed) {
      Swal.fire({ icon: 'warning', title: 'El nombre del rol es obligatorio.', confirmButtonColor: '#64BC04' });
      return;
    }

    const featureIds = this.features.filter((f) => f.checked).map((f) => f.featureId);

    this.loaderService.show();
    forkJoin({
      description: this.roleService.updateRoleDescription(this.role.roleId, { roleDescription: trimmed }),
      features:    this.roleService.updateRoleFeatures(this.role.roleId, featureIds),
    }).subscribe({
      next: () => {
        this.loaderService.hide();
        this.roleUpdated.emit();
        this.closeModal.emit();
        Swal.fire({ title: 'Rol actualizado exitosamente', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
