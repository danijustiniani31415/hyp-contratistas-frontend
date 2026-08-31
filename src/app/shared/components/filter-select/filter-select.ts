import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterKey, SharedFiltersService } from '../../services/shared-filters.service';
import { SearchSelect } from '../search-select/search-select';

/**
 * Selector simple con buscador que auto-carga sus opciones desde SharedFiltersService.
 * Los datos se piden UNA sola vez por sesión (shareReplay en el servicio).
 *
 * Uso:
 *   <app-filter-select filter="proyecto" [(value)]="proyectoId" />
 *   <app-filter-select filter="razonSocial" label="Empresa" [(value)]="empresaId" />
 *   <app-filter-select filter="mes" [(value)]="mesId" />
 *   <app-filter-select filter="anio" [(value)]="anioId" />
 *   <app-filter-select filter="semana" [(value)]="semanaId" />
 */
@Component({
  selector: 'app-filter-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SearchSelect],
  template: `
    <app-search-select
      [options]="(svc.getOptions(filter) | async) ?? []"
      displayField="nombre"
      valueField="id"
      [placeholder]="placeholder"
      [label]="label"
      [showLabel]="showLabel"
      [allowClear]="allowClear"
      [compact]="compact"
      [dark]="dark"
      [value]="value"
      (valueChange)="valueChange.emit($event)"
    />
  `,
})
export class FilterSelect {
  @Input({ required: true }) filter!: FilterKey;
  @Input() value: number | null = null;
  @Input() placeholder = 'Seleccionar...';
  @Input() label = '';
  @Input() showLabel = true;
  @Input() allowClear = true;
  @Input() compact = false;
  @Input() dark = false;
  @Output() valueChange = new EventEmitter<number | null>();

  readonly svc = inject(SharedFiltersService);
}
