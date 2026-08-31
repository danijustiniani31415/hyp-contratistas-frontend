import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { ClinicaProgramacionService } from '../../services/clinica-programacion.service';
import { ProgramacionClinicaDto } from '../../dtos/clinica.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { toIsoLocal } from '../../../../shared/utils/fecha-local.util';

import { CLINICA_TABS } from '../../shared/clinica-tabs';
interface FilterOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-clinica-programaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, FilterTriggerButton, FilterModal, SearchSelect],
  templateUrl: './programaciones.html',
  styleUrls: ['./programaciones.css'],
})
export class ProgramacionesClinica implements OnInit {
  readonly tabs = CLINICA_TABS;
  items: ProgramacionClinicaDto[] = [];
  loading = false;
  filtroEstado = '';
  filtroDesde = '';
  filtroHasta = '';
  filtrosAbiertos = false;

  readonly estados: string[] = [
    'Programado',
    'Aceptado por Clínica',
    'Rechazado por Clínica',
    'En Atención',
    'Completado',
    'No se presentó',
    'Cancelado',
  ];

  readonly estadoOptions: FilterOption[] = [
    { id: '', nombre: 'Todos los estados' },
    ...this.estados.map((e) => ({ id: e, nombre: e })),
  ];

  constructor(
    private svc: ClinicaProgramacionService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    const hoy = new Date();
    const hace30 = new Date();
    hace30.setDate(hoy.getDate() - 30);
    this.filtroDesde = toIsoLocal(hace30);
    this.filtroHasta = toIsoLocal(hoy);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.svc
      .getProgramacionesFiltradas({
        desde: this.filtroDesde || undefined,
        hasta: this.filtroHasta || undefined,
        estado: this.filtroEstado || undefined,
      })
      .subscribe({
        next: (data) => {
          this.items = data;
          this.loading = false;
          this.loaderService.hide();
        },
        error: (err) => {
          this.loading = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  clearFilters(): void {
    const hoy = new Date();
    const hace30 = new Date();
    hace30.setDate(hoy.getDate() - 30);
    this.filtroDesde = toIsoLocal(hace30);
    this.filtroHasta = toIsoLocal(hoy);
    this.filtroEstado = '';
    this.load();
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroEstado) n++;
    return n;
  }

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Programado': 'chip-blue',
      'Aceptado por Clínica': 'chip-green',
      'Rechazado por Clínica': 'chip-red',
      'En Atención': 'chip-orange',
      'Completado': 'chip-green',
      'No se presentó': 'chip-gray',
      'Cancelado': 'chip-gray',
    };
    return map[estado] ?? 'chip-gray';
  }
}
