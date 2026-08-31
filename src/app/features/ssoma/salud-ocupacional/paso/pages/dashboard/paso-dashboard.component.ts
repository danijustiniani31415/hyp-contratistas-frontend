import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { PasoService } from '../../services/paso.service';
import { PasoDashboardDto, PasoAlertaDto } from '../../dtos/paso.dtos';
import { SpiBadgeComponent } from '../../components/spi-badge/spi-badge.component';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';

import { PASO_TABS } from '../../paso-tabs';
@Component({
  selector: 'app-paso-dashboard',
  standalone: true,
  imports: [FabButton, CommonModule, SpiBadgeComponent, AbrilPageHeaderComponent],
  templateUrl: './paso-dashboard.component.html',
  styleUrl: './paso-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasoDashboardComponent implements OnInit, OnDestroy {
  readonly headerTabs = PASO_TABS;
  data: PasoDashboardDto | null = null;
  alertas: PasoAlertaDto[] = [];
  loading = false;

  dispSpi      = 0;
  dispAvance   = 0;
  dispVencidas = 0;
  dispProximas = 0;

  private timers: ReturnType<typeof setInterval>[] = [];
  readonly anioActual = new Date().getFullYear();

  constructor(
    private pasoService: PasoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void { this.timers.forEach(t => clearInterval(t)); }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    forkJoin({
      dashboard: this.pasoService.getDashboard(),
      alertas:   this.pasoService.getAlertas(),
    }).subscribe({
      next: ({ dashboard, alertas }) => {
        this.data    = dashboard;
        this.alertas = alertas;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
        this.runCountUp();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  private runCountUp(): void {
    this.timers.forEach(t => clearInterval(t));
    this.timers = [];
    this.animate('dispSpi',      0, Math.round((this.data?.spiConsolidado ?? 0) * 100), 900);
    this.animate('dispAvance',   0, Math.round(this.data?.porcentajeAvanceConsolidado ?? 0), 700);
    this.animate('dispVencidas', 0, this.data?.totalVencidas ?? 0, 600);
    this.animate('dispProximas', 0, this.data?.totalProximasVencer ?? 0, 600);
  }

  private animate(
    prop: 'dispSpi' | 'dispAvance' | 'dispVencidas' | 'dispProximas',
    from: number,
    to: number,
    ms: number,
  ): void {
    if (to === 0) { this[prop] = 0; return; }
    const steps = Math.max(1, Math.round(ms / 16));
    let step = 0;
    const inc = (to - from) / steps;
    const t = setInterval(() => {
      step++;
      this[prop] = step < steps ? Math.round(from + inc * step) : to;
      this.cdr.markForCheck();
      if (step >= steps) clearInterval(t);
    }, 16);
    this.timers.push(t);
  }

  get alertasVencidas(): PasoAlertaDto[] {
    return this.alertas.filter(a => a.tipoAlerta === 'Vencido');
  }

  get alertasProximas(): PasoAlertaDto[] {
    return this.alertas.filter(a => a.tipoAlerta === 'ProximaAVencer');
  }

  get alertasRecientes(): PasoAlertaDto[] {
    return this.alertas.slice(0, 6);
  }

  spiDotColor(color: string): string {
    if (color === 'verde')    return '#0a7c52';
    if (color === 'amarillo') return '#b45309';
    return '#b91c1c';
  }

  formatFecha(fecha: string): string {
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  }

  irALista(): void    { this.router.navigate(['/ssoma/gestion/paso/lista']); }
  irAAlertas(): void  { this.router.navigate(['/ssoma/gestion/paso/alertas']); }
  irADetalle(pasoId: number): void { this.router.navigate(['/ssoma/gestion/paso', pasoId]); }
  irANuevoPrograma(): void {
    sessionStorage.setItem('paso_abrir_instanciar', '1');
    this.router.navigate(['/ssoma/gestion/paso/lista']);
  }
}
