import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvJefeSsomaService } from '../../services/ev-jefe-ssoma.service';
import {
  EvJefeSsomaInicioDto,
  EvSupervisorContratistaCriterioDto,
  EvJefeSsomaDetalleCreateDto,
} from '../../dtos/ev-jefe-ssoma.model';
import Swal from 'sweetalert2';

interface DetalleForm {
  plantillaId: number | null;
  criterio: string;
  puntaje: number | null;
}

const PUNTAJE_LABELS: Record<number, string> = {
  1: 'Muy malo',
  2: 'Malo',
  3: 'Regular',
  4: 'Bueno',
  5: 'Excelente',
};

@Component({
  selector: 'app-evaluar-jefe-ssoma',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './evaluar-jefe-ssoma.html',
  styleUrl: './evaluar-jefe-ssoma.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluarJefeSsoma implements OnInit {
  inicio: EvJefeSsomaInicioDto | null = null;
  loading = true;
  guardando = false;

  detalles: DetalleForm[] = [];
  comentario = '';

  readonly puntajes = [1, 2, 3, 4, 5];
  readonly puntajeLabel = PUNTAJE_LABELS;

  get notaCalculada(): number {
    const validos = this.detalles.filter((d) => d.puntaje !== null);
    if (!validos.length) return 0;
    const sum = validos.reduce((s, d) => s + d.puntaje!, 0);
    return Math.round((sum / validos.length) * 4 * 100) / 100;
  }

  get puedeGuardar(): boolean {
    return this.detalles.length > 0 && this.detalles.every((d) => d.puntaje !== null);
  }

  estadoClase(nota: number | null): string {
    if (nota === null) return '';
    if (nota > 15) return 'estado-aprobado';
    if (nota >= 12) return 'estado-regular';
    return 'estado-desaprobado';
  }

  estadoLabel(nota: number | null): string {
    if (nota === null) return 'Sin evaluar';
    if (nota > 15) return 'Aprobado';
    if (nota >= 12) return 'Regular';
    return 'Desaprobado';
  }

  constructor(
    private svc: EvJefeSsomaService,
    private loader: LoaderService,
    private errorSvc: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarInicio();
  }

  cargarInicio(): void {
    this.loader.show();
    this.svc.getInicio().subscribe({
      next: (data) => {
        this.inicio = data;
        this.detalles = (data.plantilla ?? []).map((p: EvSupervisorContratistaCriterioDto) => ({
          plantillaId: p.id,
          criterio: p.criterio,
          puntaje: null,
        }));
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

  setPuntaje(idx: number, val: number): void {
    this.detalles[idx].puntaje = val;
    this.cdr.markForCheck();
  }

  guardar(): void {
    if (!this.puedeGuardar) return;

    const detallesDto: EvJefeSsomaDetalleCreateDto[] = this.detalles.map((d) => ({
      plantillaId: d.plantillaId,
      criterio: d.criterio,
      puntaje: d.puntaje!,
    }));

    Swal.fire({
      icon: 'question',
      title: 'Registrar evaluación anónima',
      text: 'Esta evaluación es anónima: el Jefe SSOMA no podrá saber que la registraste tú. ¿Confirmas?',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Revisar',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.guardando = true;
      this.loader.show();

      this.svc
        .crear({ comentario: this.comentario || null, detalles: detallesDto })
        .subscribe({
          next: () => {
            this.guardando = false;
            this.loader.hide();
            Swal.fire({
              icon: 'success',
              title: 'Evaluación registrada',
              text: 'Gracias por tu evaluación anónima.',
              timer: 2500,
              showConfirmButton: false,
            });
            this.cargarInicio();
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.guardando = false;
            this.loader.hide();
            this.errorSvc.handleError(err);
            this.cdr.markForCheck();
          },
        });
    });
  }
}
