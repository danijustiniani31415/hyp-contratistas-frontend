import { Component, OnInit } from '@angular/core';
import { ResidentCard } from './resident-card/resident-card';
import { ResidentTable } from './resident-table/resident-table';
import { ResidentMonitoringService } from '../../../core/services/residentMonitoring.service';
import { ErrorService } from '../../../core/services/error.service';
import { LoaderService } from '../../../core/services/loader.service';
import { HttpErrorResponse } from '@angular/common/http';
import { PeriodFilterDto, TrackingFiltersDto, TrackingResultDto } from '../../../core/dtos/residentMonitoring/residentMonitoringDto.model';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';

import { PROJECTS_TABS } from '../shared/projects-tabs';
type ViewMode = 'cards' | 'table';

export interface SelectedFilters {
  projectId: number | null;
  residentUserId: number | null;
  month: number | null;
  year: number | null;
}

@Component({
  selector: 'app-resident-monitoring-measurement',
  imports: [ResidentCard, ResidentTable, CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './resident-monitoring-measurement.html',
  styleUrl: './resident-monitoring-measurement.css',
})
export class ResidentMonitoringMeasurement implements OnInit {
  readonly tabs = PROJECTS_TABS;
  anioActual = new Date().getFullYear();

  residentMonitoringData: TrackingResultDto = {
    items: [],
    summary: {
      averageCompliance: 0,
      pendingDeliverables: 0,
      fullyCompleted: 0,
      criticalPending: 0,
    },
  };
  filters: TrackingFiltersDto = {
    projects: [],
    residents: [],
    periods: [],
  };

  selectedFilters: SelectedFilters = {
    projectId: null,
    residentUserId: null,
    month: null,
    year: null,
  };

  selectedPeriod: PeriodFilterDto | null = null;

  currentView: ViewMode = 'cards';

  constructor(
    private residentMonitoringService: ResidentMonitoringService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.filters.periods = this.generatePeriods();

    if (this.filters.periods.length > 0) {
      this.selectedPeriod = this.filters.periods[0];
      this.selectedFilters.month = this.selectedPeriod.month;
      this.selectedFilters.year = this.selectedPeriod.year;
    }

    this.loadInitialData();
  }

  setView(view: ViewMode): void {
    this.currentView = view;
  }

  loadInitialData() {
    this.loaderService.show();
    forkJoin({
      residentData: this.residentMonitoringService.getResidentMonitoring(this.selectedFilters),
      filters: this.residentMonitoringService.getFilters(),
    }).subscribe({
      next: ({ residentData, filters }) => {
        this.residentMonitoringData = residentData;
        this.filters.projects = filters.projects;
        this.filters.residents = filters.residents;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  loadResidentMonitoringData() {
    this.loaderService.show();
    this.residentMonitoringService.getResidentMonitoring(this.selectedFilters).subscribe({
      next: (response) => {
        this.residentMonitoringData = response;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  onSearch(): void {
    this.selectedFilters = {
      projectId: this.selectedFilters.projectId,
      residentUserId: this.selectedFilters.residentUserId,
      month: this.selectedPeriod?.month ?? null,
      year: this.selectedPeriod?.year ?? null,
    };
    this.loadResidentMonitoringData();
  }

  generatePeriods(): PeriodFilterDto[] {
    const periods: PeriodFilterDto[] = [];
    const start = new Date(2026, 0, 1); // enero 2026
    const now = new Date();
    const current = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    for (let date = new Date(start); date <= current; date.setMonth(date.getMonth() + 1)) {
      periods.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
      });
    }

    periods.reverse();
    return periods;
  }
}
