import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvPrevencionistaService } from '../../services/ev-prevencionista.service';
import { EvPrevencionistaDashboardDto, EvPrevencionistaResumenDto } from '../../dtos/ev-prevencionista.model';

@Component({
  selector: 'app-dashboard-prevencionistas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './dashboard-prevencionistas.html',
  styleUrl: './dashboard-prevencionistas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPrevencionistas implements OnInit {
  data: EvPrevencionistaDashboardDto | null = null;
  loading = true;
  busqueda = '';

  get evaluacionesFiltradas(): EvPrevencionistaResumenDto[] {
    if (!this.data?.evaluaciones) return [];
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.data.evaluaciones;
    return this.data.evaluaciones.filter(
      (e) =>
        e.evaluadoNombre.toLowerCase().includes(q) ||
        e.proyectoNombre.toLowerCase().includes(q) ||
        e.evaluadorContributorNombre.toLowerCase().includes(q),
    );
  }

  notaClase(nota: number | null): string {
    if (nota === null) return 'nota-sin';
    if (nota > 15) return 'nota-aprobado';
    if (nota >= 12) return 'nota-regular';
    return 'nota-desaprobado';
  }

  notaDisplay(nota: number | null): string {
    return nota !== null ? nota.toFixed(1) : '—';
  }

  constructor(
    private svc: EvPrevencionistaService,
    private loader: LoaderService,
    private errorSvc: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getDashboard().subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.loader.hide();
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
