import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvSupervisorContratistaService } from '../../services/ev-supervisor-contratista.service';
import {
  EvSupervisorContratistaVerInicioDto,
  EvSupervisorContratistaResumenDto,
} from '../../dtos/ev-supervisor-contratista.model';

@Component({
  selector: 'app-ver-evaluacion-supervisores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './ver-evaluacion-supervisores.html',
  styleUrl: './ver-evaluacion-supervisores.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerEvaluacionSupervisores implements OnInit {
  data: EvSupervisorContratistaVerInicioDto | null = null;
  loading = true;

  periodoId: number | null = null;
  proyectoId: number | null = null;
  busqueda = '';

  get evaluacionesFiltradas(): EvSupervisorContratistaResumenDto[] {
    if (!this.data?.evaluaciones) return [];
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.data.evaluaciones;
    return this.data.evaluaciones.filter(
      (e) =>
        e.supervisorNombre.toLowerCase().includes(q) ||
        e.contributorNombre.toLowerCase().includes(q) ||
        e.evaluadorNombre.toLowerCase().includes(q),
    );
  }

  get promedioGeneral(): number | null {
    const conNota = this.evaluacionesFiltradas.filter((e) => e.nota !== null);
    if (!conNota.length) return null;
    return Math.round((conNota.reduce((s, e) => s + e.nota!, 0) / conNota.length) * 10) / 10;
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
    private svc: EvSupervisorContratistaService,
    private loader: LoaderService,
    private errorSvc: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loader.show();
    this.svc.getVer(this.periodoId, this.proyectoId).subscribe({
      next: (d) => {
        this.data = d;
        if (!this.periodoId && d.periodos.length) {
          const activo = d.periodos.find((p) => p.activo);
          this.periodoId = (activo ?? d.periodos[0]).id;
        }
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

  filtrar(): void {
    this.loader.show();
    this.svc.getVer(this.periodoId, this.proyectoId).subscribe({
      next: (d) => {
        if (this.data) this.data.evaluaciones = d.evaluaciones;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err) => { this.loader.hide(); this.errorSvc.handleError(err); },
    });
  }
}
