import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvSupervisorContratistaService } from '../../services/ev-supervisor-contratista.service';
import {
  EvSupervisorContratistaInicioDto,
  EvSupervisorContratistaAEvaluarDto,
  EvSupervisorContratistaCriterioDto,
  EvSupervisorContratistaDetalleCreateDto,
} from '../../dtos/ev-supervisor-contratista.model';
import Swal from 'sweetalert2';

interface DetalleForm {
  plantillaId: number | null;
  criterio: string;
  puntaje: number | null;
  esNa: boolean;
}

const PUNTAJE_LABELS: Record<number, string> = {
  0: 'Inaceptable',
  1: 'Malo',
  2: 'Regular',
  3: 'Bueno',
  4: 'Excelente',
};

@Component({
  selector: 'app-evaluar-supervisor-contratista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './evaluar-supervisor-contratista.html',
  styleUrl: './evaluar-supervisor-contratista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluarSupervisorContratista implements OnInit {
  inicio: EvSupervisorContratistaInicioDto | null = null;
  loading = true;
  guardando = false;
  marcandoNoAplica = false;

  supervisorSeleccionado: EvSupervisorContratistaAEvaluarDto | null = null;
  detalles: DetalleForm[] = [];
  comentario = '';
  busqueda = '';
  proyectoFiltroId: number | null = null;
  empresaFiltroId: number | null = null;

  readonly puntajes = [0, 1, 2, 3, 4];
  readonly puntajeLabel = PUNTAJE_LABELS;

  get proyectos(): { id: number; nombre: string }[] {
    const seen = new Set<number>();
    const result: { id: number; nombre: string }[] = [];
    for (const s of this.inicio?.supervisoresAEvaluar ?? []) {
      if (!seen.has(s.proyectoId)) {
        seen.add(s.proyectoId);
        result.push({ id: s.proyectoId, nombre: s.proyectoNombre });
      }
    }
    return result.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get empresas(): { id: number; nombre: string }[] {
    const seen = new Set<number>();
    const result: { id: number; nombre: string }[] = [];
    for (const s of this.inicio?.supervisoresAEvaluar ?? []) {
      if (!seen.has(s.contributorId)) {
        seen.add(s.contributorId);
        result.push({ id: s.contributorId, nombre: s.contributorNombre });
      }
    }
    return result.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get supervisoresFiltrados(): EvSupervisorContratistaAEvaluarDto[] {
    if (!this.inicio?.supervisoresAEvaluar) return [];
    let lista = this.inicio.supervisoresAEvaluar;
    if (this.proyectoFiltroId !== null) {
      lista = lista.filter((s) => s.proyectoId === this.proyectoFiltroId);
    }
    if (this.empresaFiltroId !== null) {
      lista = lista.filter((s) => s.contributorId === this.empresaFiltroId);
    }
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (s) =>
        s.supervisorNombre.toLowerCase().includes(q) ||
        s.contributorNombre.toLowerCase().includes(q) ||
        s.proyectoNombre.toLowerCase().includes(q),
    );
  }

  get notaCalculada(): number {
    const validos = this.detalles.filter((d) => !d.esNa && d.puntaje !== null);
    if (!validos.length) return 0;
    const sum = validos.reduce((s, d) => s + d.puntaje!, 0);
    const max = validos.length * 4;
    return Math.round((sum / max) * 20 * 10) / 10;
  }

  get puedeGuardar(): boolean {
    return (
      !!this.supervisorSeleccionado &&
      this.detalles.every((d) => d.esNa || d.puntaje !== null) &&
      this.detalles.some((d) => !d.esNa) &&
      this.detalles.length > 0
    );
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
    private svc: EvSupervisorContratistaService,
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

  seleccionarSupervisor(s: EvSupervisorContratistaAEvaluarDto): void {
    this.supervisorSeleccionado = s;
    this.busqueda = '';

    if (s.yaEvalue && s.detallesPrevios.length > 0) {
      // Editando una evaluación ya registrada: precarga lo que puso, mientras el período siga abierto.
      this.comentario = s.comentarioPrevio ?? '';
      this.detalles = s.detallesPrevios.map((d) => ({
        plantillaId: d.plantillaId,
        criterio: d.criterio,
        puntaje: d.puntaje,
        esNa: d.esNa,
      }));
    } else {
      this.comentario = '';
      this.detalles = (this.inicio?.plantilla ?? []).map((p: EvSupervisorContratistaCriterioDto) => ({
        plantillaId: p.id,
        criterio: p.criterio,
        puntaje: null,
        esNa: false,
      }));
    }
    this.cdr.markForCheck();
  }

  setPuntaje(idx: number, val: number): void {
    this.detalles[idx].puntaje = val;
    this.detalles[idx].esNa = false;
    this.cdr.markForCheck();
  }

  setNa(idx: number): void {
    this.detalles[idx].esNa = true;
    this.detalles[idx].puntaje = null;
    this.cdr.markForCheck();
  }

  cambiarSupervisor(): void {
    this.supervisorSeleccionado = null;
    this.detalles = [];
    this.comentario = '';
    this.cdr.markForCheck();
  }

  markForCheck(): void {
    this.cdr.markForCheck();
  }

  marcarNoAplica(): void {
    this.pedirMotivoYRegistrar('No corresponde evaluar supervisores este período');
  }

  marcarNoAplicaSupervisor(): void {
    if (!this.supervisorSeleccionado) return;
    this.pedirMotivoYRegistrar(
      `No corresponde evaluar a ${this.supervisorSeleccionado.supervisorNombre}`,
      this.supervisorSeleccionado.proyectoId,
      this.supervisorSeleccionado.supervisorSsContratistaUsuarioId,
    );
  }

  private pedirMotivoYRegistrar(titulo: string, proyectoId?: number, supervisorSsContratistaUsuarioId?: number): void {
    Swal.fire({
      icon: 'question',
      title: titulo,
      input: 'textarea',
      inputPlaceholder: 'Motivo (obligatorio)...',
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (!value?.trim() ? 'Debes indicar un motivo' : undefined),
    }).then((result) => {
      if (!result.isConfirmed || !result.value) return;

      this.marcandoNoAplica = true;
      this.loader.show();
      this.svc.marcarNoAplica(result.value.trim(), proyectoId, supervisorSsContratistaUsuarioId).subscribe({
        next: () => {
          this.marcandoNoAplica = false;
          this.loader.hide();
          Swal.fire({ icon: 'success', title: 'Registrado', timer: 2000, showConfirmButton: false });
          this.cambiarSupervisor();
          this.cargarInicio();
        },
        error: (err) => {
          this.marcandoNoAplica = false;
          this.loader.hide();
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  guardar(): void {
    if (!this.puedeGuardar || !this.supervisorSeleccionado) return;

    const detallesDto: EvSupervisorContratistaDetalleCreateDto[] = this.detalles.map((d) => ({
      plantillaId: d.plantillaId,
      criterio: d.criterio,
      puntaje: d.esNa ? null : d.puntaje,
      esNa: d.esNa,
    }));

    this.guardando = true;
    this.loader.show();

    const dto = {
      supervisorSsContratistaUsuarioId: this.supervisorSeleccionado.supervisorSsContratistaUsuarioId,
      proyectoId: this.supervisorSeleccionado.proyectoId,
      comentario: this.comentario || null,
      detalles: detallesDto,
    };

    const editando = this.supervisorSeleccionado.yaEvalue && this.supervisorSeleccionado.evaluacionId != null;
    const request = editando
      ? this.svc.actualizar(this.supervisorSeleccionado.evaluacionId!, dto)
      : this.svc.crear(dto);

    request.subscribe({
      next: (res) => {
        this.guardando = false;
        this.loader.hide();
        Swal.fire({
          icon: 'success',
          title: editando ? 'Evaluación actualizada' : 'Evaluación registrada',
          text: `Nota: ${res.nota} / 20`,
          timer: 2500,
          showConfirmButton: false,
        });
        this.cambiarSupervisor();
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
  }
}
