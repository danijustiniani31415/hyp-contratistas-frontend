import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvGestionSsomaService } from '../../services/ev-gestion-ssoma.service';
import {
  EvGestionSsomaResultadosDto,
  EvGestionSsomaCumplimientoDto,
  EvGestionSsomaResumenDto,
} from '../../dtos/ev-gestion-ssoma.model';

const RELACION_LABELS: Record<string, string> = {
  D1: 'Jefe SSOMA → Prevencionista',
  D2: 'Jefe SSOMA → Coordinador SSOMA',
  D3: 'Coordinador SSOMA → Prevencionista',
  D4: 'Prevencionista → su Coordinador SSOMA (anónima)',
  D5: 'Prevencionista → Prevencionista',
};

@Component({
  selector: 'app-resultados-gestion-ssoma',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './resultados-gestion-ssoma.html',
  styleUrl: './resultados-gestion-ssoma.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadosGestionSsoma implements OnInit {
  resultados: EvGestionSsomaResultadosDto | null = null;
  cumplimiento: EvGestionSsomaCumplimientoDto | null = null;
  loading = true;
  filtroRelacion = '';

  readonly relacionLabel = RELACION_LABELS;

  get relacionesDisponibles(): string[] {
    const set = new Set((this.resultados?.evaluaciones ?? []).map((e) => e.relacion));
    return Array.from(set).sort();
  }

  get evaluacionesFiltradas(): EvGestionSsomaResumenDto[] {
    const lista = this.resultados?.evaluaciones ?? [];
    if (!this.filtroRelacion) return lista;
    return lista.filter((e) => e.relacion === this.filtroRelacion);
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

  get porcentajeCompletado(): number {
    if (!this.cumplimiento || !this.cumplimiento.totalEsperadas) return 0;
    return Math.round((this.cumplimiento.totalCompletadas / this.cumplimiento.totalEsperadas) * 100);
  }

  constructor(
    private svc: EvGestionSsomaService,
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
    Promise.all([
      this.svc.getResultados().toPromise(),
      this.svc.getPendientes().toPromise(),
    ])
      .then(([resultados, cumplimiento]) => {
        this.resultados = resultados ?? null;
        this.cumplimiento = cumplimiento ?? null;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      })
      .catch((err) => {
        this.loading = false;
        this.loader.hide();
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      });
  }
}
