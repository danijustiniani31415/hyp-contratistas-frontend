import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterKey, SharedFiltersService } from '../../services/shared-filters.service';
import { MultiSearchSelect } from '../multi-search-select/multi-search-select';

/**
 * Selector múltiple con buscador que auto-carga sus opciones desde SharedFiltersService.
 * El desplegable permanece abierto al marcar/desmarcar. Emite un arreglo de ids.
 *
 * Uso:
 *   <app-filter-multi-select filter="proyecto" [(value)]="proyectoIds" />
 *   <app-filter-multi-select filter="razonSocial" label="Empresas" [(value)]="empresaIds" />
 */
@Component({
  selector: 'app-filter-multi-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MultiSearchSelect],
  template: `
    <app-multi-search-select
      [options]="(svc.getOptions(filter) | async) ?? []"
      displayField="nombre"
      valueField="id"
      [placeholder]="placeholder"
      [label]="label"
      [showLabel]="showLabel"
      [allowClear]="allowClear"
      [compact]="compact"
      [value]="value"
      (valueChange)="valueChange.emit($event)"
    />
  `,
})
export class FilterMultiSelect {
  @Input({ required: true }) filter!: FilterKey;
  @Input() value: number[] = [];
  @Input() placeholder = 'Seleccionar...';
  @Input() label = '';
  @Input() showLabel = true;
  @Input() allowClear = true;
  @Input() compact = false;
  @Output() valueChange = new EventEmitter<number[]>();

  readonly svc = inject(SharedFiltersService);
}
