import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RacService } from '../../services/rac.service';
import { RacDashboardDto } from '../../dtos/rac.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { FabButton } from '../../../../../../shared/components/fab-button/fab-button';
import { AuthService } from '../../../../../../core/services/auth.service';

import { RAC_TABS } from '../../rac-tabs';
@Component({
  selector: 'app-rac-dashboard',
  standalone: true,
  imports: [FabButton, CommonModule, AbrilPageHeaderComponent],
  templateUrl: './rac-dashboard.html',
  styleUrl: './rac-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RacDashboard implements OnInit {
  readonly tabs = RAC_TABS;
  data: RacDashboardDto | null = null;
  loading = true;
  error = '';
  anioActual = new Date().getFullYear();

  constructor(
    private racService: RacService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  get esContratista(): boolean {
    return this.authService.isContratista();
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.racService.getDashboard().subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudo cargar el dashboard.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  irANuevo(): void {
    this.router.navigate(['/ssoma/gestion/rac/nuevo']);
  }

  irALista(): void {
    this.router.navigate(['/ssoma/gestion/rac/lista']);
  }

  mesLabel(mes: number): string {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return meses[mes - 1] ?? String(mes);
  }

  maxTendencia(): number {
    if (!this.data?.tendencia?.length) return 1;
    return Math.max(...this.data.tendencia.map(t => t.total), 1);
  }

  barHeight(total: number): number {
    return Math.round((total / this.maxTendencia()) * 80);
  }
}
