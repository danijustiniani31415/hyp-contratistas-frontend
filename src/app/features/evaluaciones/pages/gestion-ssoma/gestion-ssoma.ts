import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvGestionSsomaService } from '../../services/ev-gestion-ssoma.service';
import {
  EvGestionSsomaInicioDto,
  EvGestionSsomaAEvaluarDto,
  EvSupervisorContratistaCriterioDto,
  EvGestionSsomaDetalleCreateDto,
} from '../../dtos/ev-gestion-ssoma.model';
import Swal from 'sweetalert2';

interface DetalleForm {
  plantillaId: number | null;
  criterio: string;
  puntaje: number | null;
}

interface CandidatoUi extends EvGestionSsomaAEvaluarDto {
  tipo: 'Prevencionista' | 'Coordinador SSOMA';
  /** true = "Mi coordinador SSOMA" (D4): el guardado va sin evaluadoUserId, el
   * servidor resuelve el destinatario y nunca queda asociado a quien evalúa. */
  esAnonimo?: boolean;
}

const PUNTAJE_LABELS: Record<number, string> = {
  1: 'Muy malo',
  2: 'Malo',
  3: 'Regular',
  4: 'Bueno',
  5: 'Excelente',
};

@Component({
  selector: 'app-gestion-ssoma',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './gestion-ssoma.html',
  styleUrl: './gestion-ssoma.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionSsoma implements OnInit {
  inicio: EvGestionSsomaInicioDto | null = null;
  loading = true;
  guardando = false;

  // Lista de candidatos a evaluar: Jefe SSOMA ve Prevencionistas + Coordinadores;
  // Coordinador SSOMA ve los Prevencionistas de su proyecto; Prevencionista ve a
  // los demás Prevencionistas de su proyecto (D5) y a "Mi Coordinador SSOMA"
  // (D4, anónimo — es una tarjeta más de la lista, no una vista aparte).
  seleccionado: CandidatoUi | null = null;
  busqueda = '';

  detalles: DetalleForm[] = [];
  fortalezas = '';
  oportunidadesMejora = '';

  readonly puntajes = [1, 2, 3, 4, 5];
  readonly puntajeLabel = PUNTAJE_LABELS;

  get candidatos(): CandidatoUi[] {
    const prev = (this.inicio?.prevencionistas ?? []).map((p) => ({ ...p, tipo: 'Prevencionista' as const }));
    const coord = (this.inicio?.coordinadores ?? []).map((c) => ({ ...c, tipo: 'Coordinador SSOMA' as const }));
    const miCoord = this.inicio?.miCoordinador
      ? [{
          ...this.inicio.miCoordinador,
          nombreCompleto: 'Mi Coordinador SSOMA',
          tipo: 'Coordinador SSOMA' as const,
          esAnonimo: true,
          yaEvalue: this.inicio.yaEvalueMiCoordinador,
        }]
      : [];
    return [...miCoord, ...prev, ...coord];
  }

  get candidatosFiltrados(): CandidatoUi[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.candidatos;
    return this.candidatos.filter(
      (c) =>
        c.nombreCompleto.toLowerCase().includes(q) ||
        (c.proyectoNombre ?? '').toLowerCase().includes(q),
    );
  }

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
    private svc: EvGestionSsomaService,
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
        this.loading = false;
        this.loader.hide();
        this.seleccionado = null;
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

  private nuevosDetalles(tipo: CandidatoUi['tipo']): DetalleForm[] {
    const plantilla = tipo === 'Coordinador SSOMA'
      ? (this.inicio?.plantillaCoordinador ?? [])
      : (this.inicio?.plantillaPrevencionista ?? []);
    return plantilla.map((p: EvSupervisorContratistaCriterioDto) => ({
      plantillaId: p.id,
      criterio: p.criterio,
      puntaje: null,
    }));
  }

  seleccionarCandidato(c: CandidatoUi): void {
    if (c.yaEvalue) return;
    this.seleccionado = c;
    this.busqueda = '';
    this.detalles = this.nuevosDetalles(c.tipo);
    this.fortalezas = '';
    this.oportunidadesMejora = '';
    this.cdr.markForCheck();
  }

  cambiarCandidato(): void {
    this.seleccionado = null;
    this.detalles = [];
    this.fortalezas = '';
    this.oportunidadesMejora = '';
    this.cdr.markForCheck();
  }

  setPuntaje(idx: number, val: number): void {
    this.detalles[idx].puntaje = val;
    this.cdr.markForCheck();
  }

  guardar(): void {
    if (!this.puedeGuardar || !this.seleccionado) return;
    const esAnonimo = !!this.seleccionado.esAnonimo;

    const detallesDto: EvGestionSsomaDetalleCreateDto[] = this.detalles.map((d) => ({
      plantillaId: d.plantillaId,
      criterio: d.criterio,
      puntaje: d.puntaje!,
    }));

    const dto = {
      evaluadoUserId: esAnonimo ? null : this.seleccionado.userId,
      fortalezas: this.fortalezas.trim() || null,
      oportunidadesMejora: this.oportunidadesMejora.trim() || null,
      detalles: detallesDto,
    };

    const registrar = () => {
      this.guardando = true;
      this.loader.show();
      this.svc.crear(dto).subscribe({
        next: () => {
          this.guardando = false;
          this.loader.hide();
          Swal.fire({
            icon: 'success',
            title: 'Evaluación registrada',
            timer: 2500,
            showConfirmButton: false,
          });
          this.seleccionado = null;
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
    };

    if (esAnonimo) {
      Swal.fire({
        icon: 'question',
        title: 'Registrar evaluación anónima',
        text: 'Esta evaluación es anónima: tu Coordinador SSOMA no podrá saber que la registraste tú. ¿Confirmas?',
        showCancelButton: true,
        confirmButtonText: 'Sí, registrar',
        cancelButtonText: 'Revisar',
      }).then((result) => {
        if (result.isConfirmed) registrar();
      });
    } else {
      registrar();
    }
  }
}
