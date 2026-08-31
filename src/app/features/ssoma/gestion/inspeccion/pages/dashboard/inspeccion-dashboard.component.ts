import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { InspeccionService } from '../../inspeccion.service';
import { InspeccionDashboardDto } from '../../inspeccion.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';

import { INSPECCION_TABS } from '../../inspeccion-tabs';
@Component({
  selector: 'app-inspeccion-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FabButton, CommonModule, AbrilPageHeaderComponent],
  templateUrl: './inspeccion-dashboard.component.html',
  styleUrl: './inspeccion-dashboard.component.css',
})
export class InspeccionDashboardComponent implements OnInit {
  readonly tabs = INSPECCION_TABS;
  data: InspeccionDashboardDto | null = null;
  loading = true;
  readonly anioActual = new Date().getFullYear();

  constructor(
    private inspeccionService: InspeccionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.inspeccionService.getDashboard().subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  irANueva(): void {
    this.router.navigate(['/ssoma/gestion/inspeccion/nueva']);
  }

  scoreClass(v?: number | null): string {
    if (v == null) return 'score-na';
    if (v >= 80) return 'score-verde';
    if (v >= 60) return 'score-amarillo';
    return 'score-rojo';
  }

  maxTendencia(): number {
    if (!this.data?.tendenciaMensual?.length) return 1;
    return Math.max(...this.data.tendenciaMensual.map((t) => t.total), 1);
  }

  barHeight(v: number): number {
    return Math.round((v / this.maxTendencia()) * 72);
  }

  maxTipo(): number {
    if (!this.data?.porTipo?.length) return 1;
    return Math.max(...this.data.porTipo.map((t) => t.total), 1);
  }

  barWidthPct(v: number): number {
    return Math.round((v / this.maxTipo()) * 100);
  }

  ambitoClass(ambito: string): string {
    if (ambito === 'Seguridad') return 'badge-seguridad';
    if (ambito === 'Salud') return 'badge-salud';
    return 'badge-ambiente';
  }

  tipoClass(tipo: string): string {
    if (tipo === 'Critico') return 'badge-critico';
    if (tipo === 'Mayor') return 'badge-mayor';
    return 'badge-menor';
  }
}
