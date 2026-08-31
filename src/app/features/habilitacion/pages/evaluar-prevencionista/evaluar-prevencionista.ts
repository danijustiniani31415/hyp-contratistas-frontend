import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent, AbrilPageTab } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvPrevencionistaService } from '../../../evaluaciones/services/ev-prevencionista.service';
import {
  EvPrevencionistaInicioDto,
  EvPrevencionistaAEvaluarDto,
  EvSupervisorContratistaCriterioDto,
  EvPrevencionistaDetalleCreateDto,
} from '../../../evaluaciones/dtos/ev-prevencionista.model';
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
  selector: 'app-evaluar-prevencionista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './evaluar-prevencionista.html',
  styleUrl: './evaluar-prevencionista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluarPrevencionista implements OnInit {
  inicio: EvPrevencionistaInicioDto | null = null;
  loading = true;
  guardando = false;

  seleccionado: EvPrevencionistaAEvaluarDto | null = null;
  detalles: DetalleForm[] = [];
  comentario = '';

  readonly puntajes = [1, 2, 3, 4, 5];
  readonly puntajeLabel = PUNTAJE_LABELS;

  readonly headerTabs: AbrilPageTab[] = [
    { label: 'Panel',        icono: 'ti-layout-dashboard', route: '/habilitacion/dashboard-contratista' },
    { label: 'Trabajadores', icono: 'ti-users',            route: '/habilitacion/gestion/trabajadores' },
    { label: 'Empresa',      icono: 'ti-building',         route: '/habilitacion/gestion/empresa' },
    { label: 'Equipos',      icono: 'ti-truck',            route: '/habilitacion/gestion/equipos' },
    { label: 'SCTR',         icono: 'ti-shield-check',     route: '/habilitacion/gestion/sctr-vidaley' },
    { label: 'Inducciones',  icono: 'ti-school',           route: '/habilitacion/gestion/inducciones' },
    { label: 'Evaluar SSOMA', icono: 'ti-clipboard-check', route: '/habilitacion/evaluar-prevencionista' },
    { label: 'Mi Desempeño', icono: 'ti-report',          route: '/habilitacion/mi-perfil-supervisor' },
  ];

  get puedeGuardar(): boolean {
    return this.detalles.length > 0 && this.detalles.every((d) => d.puntaje !== null);
  }

  get notaCalculada(): number {
    const validos = this.detalles.filter((d) => d.puntaje !== null);
    if (!validos.length) return 0;
    const sum = validos.reduce((s, d) => s + d.puntaje!, 0);
    return Math.round((sum / validos.length) * 4 * 100) / 100;
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
    private svc: EvPrevencionistaService,
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

  seleccionar(a: EvPrevencionistaAEvaluarDto): void {
    this.seleccionado = a;
    this.comentario = '';
    const plantilla = a.evaluadoPuesto === 'Coordinador SSOMA'
      ? (this.inicio?.plantillaCoordinador ?? [])
      : (this.inicio?.plantillaPrevencionista ?? []);
    this.detalles = plantilla.map((p: EvSupervisorContratistaCriterioDto) => ({
      plantillaId: p.id,
      criterio: p.criterio,
      puntaje: null,
    }));
    this.cdr.markForCheck();
  }

  cambiarSeleccion(): void {
    this.seleccionado = null;
    this.detalles = [];
    this.comentario = '';
    this.cdr.markForCheck();
  }

  setPuntaje(idx: number, val: number): void {
    this.detalles[idx].puntaje = val;
    this.cdr.markForCheck();
  }

  guardar(): void {
    if (!this.puedeGuardar || !this.seleccionado) return;

    const detallesDto: EvPrevencionistaDetalleCreateDto[] = this.detalles.map((d) => ({
      plantillaId: d.plantillaId,
      criterio: d.criterio,
      puntaje: d.puntaje!,
    }));

    this.guardando = true;
    this.loader.show();

    this.svc
      .crear({
        evaluadoUserId: this.seleccionado.evaluadoUserId,
        proyectoId: this.seleccionado.proyectoId,
        comentario: this.comentario || null,
        detalles: detallesDto,
      })
      .subscribe({
        next: (res) => {
          this.guardando = false;
          this.loader.hide();
          Swal.fire({
            icon: 'success',
            title: 'Evaluación registrada',
            text: `Nota: ${res.nota} / 20`,
            timer: 2500,
            showConfirmButton: false,
          });
          this.cambiarSeleccion();
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
