import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClinicaProgramacionService } from '../../services/clinica-programacion.service';
import { InterconsultaService } from '../../../ssoma/salud-ocupacional/services/interconsulta.service';
import { DashboardSaludService } from '../../../ssoma/salud-ocupacional/services/dashboard-salud.service';
import { ProximoVencerDto } from '../../../ssoma/salud-ocupacional/dtos/dashboard-salud.model';

import { CLINICA_TABS } from '../../shared/clinica-tabs';
@Component({
  selector: 'app-clinica-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class ClinicaDashboard implements OnInit {
  readonly tabs = CLINICA_TABS;
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  loading = true;

  sinEmo = 0;
  emosVencidos = 0;
  vence7 = 0;
  vence30 = 0;

  progHoy = 0;
  progEnProceso = 0;
  progCompletadas = 0;

  interconsultasPendientes = 0;
  programacionesSemana = 0;
  proximosVencer: ProximoVencerDto[] = [];

  constructor(
    private progSvc: ClinicaProgramacionService,
    private icSvc: InterconsultaService,
    private dashSvc: DashboardSaludService,
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    }, 10000);

    forkJoin({
      prog: this.progSvc.getProgramacionesHoy().pipe(catchError(() => of(null))),
      ic: this.icSvc.getInterconsultas({ estado: 'Pendiente', pageSize: 1 }).pipe(catchError(() => of(null))),
      dash: this.dashSvc.getDashboard().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ prog, ic, dash }) => {
          if (prog) {
            this.progHoy = prog.length;
            this.progEnProceso = prog.filter((p) =>
              ['Aceptado por Clínica', 'En Atención'].includes(p.estado),
            ).length;
            this.progCompletadas = prog.filter((p) => p.estado === 'Completado').length;
          }

          if (ic) {
            this.interconsultasPendientes = ic.totalRecords;
          }

          if (dash) {
            this.sinEmo = dash.emosPorAptitud.sinEmo;
            this.emosVencidos = dash.emosVencidos;
            this.vence7 = dash.emosPorVencer.dias7;
            this.vence30 = dash.emosPorVencer.dias30;
            this.programacionesSemana = dash.programacionesSemana;
            this.proximosVencer = (dash.proximosVencer ?? []).slice(0, 5);
          }

          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Navegación desde KPI cards ───────────────────────
  navegarConFiltro(ruta: string, filtro?: string): void {
    this.router.navigate([ruta], filtro ? { queryParams: { filtro } } : {});
  }

  // ── Porcentajes para barras de progreso ───────────────
  get pctCompletadas(): number {
    return this.progHoy > 0 ? (this.progCompletadas / this.progHoy) * 100 : 0;
  }

  get pctEnProceso(): number {
    return this.progHoy > 0 ? (this.progEnProceso / this.progHoy) * 100 : 0;
  }

  // ── Semáforo días a vencer ────────────────────────────
  diasVencerClass(dias: number): string {
    if (dias <= 7) return 'badge-red';
    if (dias <= 15) return 'badge-orange';
    return 'badge-yellow';
  }
}
