import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { DatePicker } from '../../../../shared/components/date-picker/date-picker';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';

import { InvoiceService } from '../facturas/services/invoice.service';
import {
  InvoiceFilterDto,
  InvoiceSupplierDto,
  InvoicePaymentFormDto,
  InvoiceCurrencyDto,
  InvoiceDashboardDto,
  InvoiceChartItemDto,
} from '../facturas/dtos/invoice.dtos';

import { CONTABILIDAD_TABS } from '../../shared/contabilidad-tabs';
Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-facturas-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, DatePicker, AbrilPageHeaderComponent],
  templateUrl: './dashboard.html',
  styles: [`:host { display: flex; flex-direction: column; flex: 1; min-height: 0; }`],
})
export class FacturasDashboard implements OnInit, OnDestroy {
  readonly tabs = CONTABILIDAD_TABS;
  anioActual = new Date().getFullYear();

  filters: InvoiceFilterDto = {
    search: null, serie: null, correlativo: null,
    contributorId: null, contributorRuc: null,
    abrilContributorId: null, abrilContributorRuc: null,
    invoicePaymentFormId: null, totalMin: null, totalMax: null,
    issueDateFrom: null, issueDateTo: null, page: 1,
  };

  suppliers: InvoiceSupplierDto[] = [];
  paymentForms: InvoicePaymentFormDto[] = [];
  abrilCompanies: InvoiceSupplierDto[] = [];
  currencies: InvoiceCurrencyDto[] = [];
  data: InvoiceDashboardDto | null = null;

  showAdvanced = false;

  private readonly months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
  private readonly greens = ['#64BC04', '#83c936', '#a2d768', '#509603', '#3c7102', '#c1e49b', '#74c31d', '#284b02', '#b2de82', '#1e3801'];
  private readonly palette = ['#64BC04', '#0086A5', '#F9A826', '#C7CEEA', '#F6C1CC', '#83c936', '#15445C'];
  private charts: Chart[] = [];

  constructor(
    private service: InvoiceService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getDashboardInit(this.filters).subscribe({
      next: (res) => {
        this.suppliers = res.suppliers;
        this.paymentForms = res.paymentForms;
        this.abrilCompanies = res.abrilCompanies;
        this.currencies = res.currencies;
        this.data = res.dashboard;
        this.loaderService.hide();
        this.cdr.detectChanges();
        setTimeout(() => this.renderAll());
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  onSearch(): void {
    this.loaderService.show();
    this.service.getDashboard(this.filters).subscribe({
      next: (res) => {
        this.data = res;
        this.loaderService.hide();
        this.cdr.detectChanges();
        setTimeout(() => this.renderAll());
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  clearFilters(): void {
    this.filters = {
      search: null, serie: null, correlativo: null,
      contributorId: null, contributorRuc: null,
      abrilContributorId: null, abrilContributorRuc: null,
      invoicePaymentFormId: null, totalMin: null, totalMax: null,
      issueDateFrom: null, issueDateTo: null, page: 1,
    };
    this.onSearch();
  }

  private monthLabel(it: InvoiceChartItemDto): string {
    return `${this.months[(it.month - 1) % 12]} ${it.year}`;
  }

  private destroyCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private renderAll(): void {
    if (!this.data) return;
    this.destroyCharts();
    this.lineChart('chart-mes', this.data.byMonth);
    this.doughnut('chart-pago', this.data.byPaymentForm);
    this.doughnut('chart-abril', this.data.byAbril);
    this.barChart('chart-proveedores', this.data.topSuppliers);
  }

  private lineChart(id: string, items: InvoiceChartItemDto[]): void {
    const el = document.getElementById(id) as HTMLCanvasElement | null;
    if (!el) return;
    this.charts.push(new Chart(el, {
      type: 'bar',
      data: {
        labels: items.map((i) => this.monthLabel(i)),
        datasets: [{
          label: 'Total',
          data: items.map((i) => i.total),
          backgroundColor: '#64BC04',
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, datalabels: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    }));
  }

  private barChart(id: string, items: InvoiceChartItemDto[]): void {
    const el = document.getElementById(id) as HTMLCanvasElement | null;
    if (!el) return;
    this.charts.push(new Chart(el, {
      type: 'bar',
      data: {
        labels: items.map((i) => i.label),
        datasets: [{
          label: 'Total',
          data: items.map((i) => i.total),
          backgroundColor: this.greens[0],
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, datalabels: { display: false } },
        scales: { x: { beginAtZero: true } },
      },
    }));
  }

  private doughnut(id: string, items: InvoiceChartItemDto[]): void {
    const el = document.getElementById(id) as HTMLCanvasElement | null;
    if (!el) return;
    this.charts.push(new Chart(el, {
      type: 'doughnut',
      data: {
        labels: items.map((i) => i.label),
        datasets: [{
          data: items.map((i) => i.total),
          backgroundColor: items.map((_, idx) => this.palette[idx % this.palette.length]),
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          datalabels: { display: false },
        },
      },
    }));
  }
}
