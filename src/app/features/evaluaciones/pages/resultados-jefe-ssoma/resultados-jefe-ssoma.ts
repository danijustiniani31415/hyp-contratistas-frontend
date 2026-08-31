import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvJefeSsomaService } from '../../services/ev-jefe-ssoma.service';
import { EvJefeSsomaResultadosDto, EvJefeSsomaCumplimientoDto } from '../../dtos/ev-jefe-ssoma.model';

@Component({
  selector: 'app-resultados-jefe-ssoma',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './resultados-jefe-ssoma.html',
  styleUrl: './resultados-jefe-ssoma.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadosJefeSsoma implements OnInit {
  resultados: EvJefeSsomaResultadosDto | null = null;
  cumplimiento: EvJefeSsomaCumplimientoDto | null = null;
  loading = true;

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
    if (!this.cumplimiento || !this.cumplimiento.totalEvaluadores) return 0;
    return Math.round((this.cumplimiento.totalCompletaron / this.cumplimiento.totalEvaluadores) * 100);
  }

  constructor(
    private svc: EvJefeSsomaService,
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
