import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import Swal from 'sweetalert2';

import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { ProjectResidentService } from '../../../../core/services/projectResident.service';
import { ProjectSimpleDTO } from '../../../../core/dtos/project/projectSimple.model';
import { PROJECTS_TABS } from '../../shared/projects-tabs';
import { PlaneamientoBimService } from '../services/planeamiento-bim.service';
import { PlaneamientoBimSubnavComponent } from '../shared/planeamiento-bim-subnav/planeamiento-bim-subnav';
import { EvidenciaFotoDto } from '../dtos/planeamiento-bim-carga-diaria.dto';
import { RestriccionDto } from '../dtos/planeamiento-bim-restriccion.dto';
import {
  AvanceProyectoDto,
  CausaParetoDto,
  CausasParetoDto,
  PlanMaestroSemanaDto,
  PpcHistoricoDto,
} from '../dtos/planeamiento-bim-dashboard.dto';

Chart.register(...registerables);

type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'GRIS';

const SEMAFORO_COLORES: Record<Semaforo, string> = {
  VERDE: '#1B6B3A',
  AMARILLO: '#D97706',
  ROJO: '#C0392B',
  GRIS: '#94A3B8',
};

interface CausaParetoConAcumulado extends CausaParetoDto {
  porcentajeAcumulado: number;
}

function hoyISO(): string {
  return new Date().toISOString().split('T')[0];
}

function haceDiasISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().split('T')[0];
}

@Component({
  selector: 'app-planeamiento-bim-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, PlaneamientoBimSubnavComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class PlaneamientoBimDashboard implements OnInit, OnDestroy {
  readonly tabs = PROJECTS_TABS;

  projects: ProjectSimpleDTO[] = [];
  selectedProjectId: number | null = null;
  loadingProjects = false;
  projectsError: string | null = null;

  // ── Rango de fechas compartido (avance / ppc / pareto) ────────
  desde: string = haceDiasISO(30);
  hasta: string = hoyISO();

  // ── Control de Avance ──────────────────────────────────────────
  avanceData: AvanceProyectoDto | null = null;
  loadingAvance = false;
  avanceError: string | null = null;

  // ── Plan Maestro + edición de metas semanales ───────────────────
  planMaestro: PlanMaestroSemanaDto[] = [];
  loadingPlanMaestro = false;
  planMaestroError: string | null = null;
  editandoMetas = false;
  savingMetas = false;
  private metasEditadas = new Map<string, number>();

  // ── PPC ───────────────────────────────────────────────────────
  ppcData: PpcHistoricoDto | null = null;
  loadingPpc = false;
  ppcError: string | null = null;
  @ViewChild('ppcCanvas') ppcCanvasRef?: ElementRef<HTMLCanvasElement>;
  private ppcChart?: Chart;

  // ── Pareto de causas ──────────────────────────────────────────
  paretoData: CausasParetoDto | null = null;
  paretoCausas: CausaParetoConAcumulado[] = [];
  loadingPareto = false;
  paretoError: string | null = null;
  @ViewChild('paretoCanvas') paretoCanvasRef?: ElementRef<HTMLCanvasElement>;
  private paretoChart?: Chart;

  // ── Evidencia fotográfica del día ────────────────────────────
  fechaEvidencias: string = hoyISO();
  evidencias: EvidenciaFotoDto[] = [];
  loadingEvidencias = false;
  evidenciasError: string | null = null;

  // ── Restricciones abiertas ────────────────────────────────────
  restriccionesActivas: RestriccionDto[] = [];
  loadingRestricciones = false;
  restriccionesError: string | null = null;

  constructor(
    private bimService: PlaneamientoBimService,
    private projectResidentService: ProjectResidentService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.cargarProyectos();
  }

  /** Deep-link desde la tabla de Portafolio (`?projectId=`): preselecciona el
   *  proyecto apenas termina de cargar la lista, sin tocar el flujo manual normal. */
  private preseleccionarDesdeQueryParam(): void {
    const raw = this.route.snapshot.queryParamMap.get('projectId');
    if (!raw) return;
    const projectId = Number(raw);
    if (!projectId || !this.projects.some((p) => p.projectId === projectId)) return;
    this.onProjectChange(projectId);
  }

  ngOnDestroy(): void {
    this.ppcChart?.destroy();
    this.paretoChart?.destroy();
  }

  cargarProyectos(): void {
    this.loadingProjects = true;
    this.projectsError = null;

    this.projectResidentService.getProjectsDescription().subscribe({
      next: (res) => {
        this.projects = (res || []).sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        this.loadingProjects = false;
        this.cdr.detectChanges();
        this.preseleccionarDesdeQueryParam();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingProjects = false;
        this.projectsError = this.mensajeError(err, 'No se pudo cargar la lista de proyectos.');
        this.cdr.detectChanges();
      },
    });
  }

  onProjectChange(projectId: number | null): void {
    if (!projectId) return;
    this.selectedProjectId = Number(projectId);
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.cargarAvance();
    this.cargarPlanMaestro();
    this.cargarPpc();
    this.cargarPareto();
    this.cargarEvidencias();
    this.cargarRestriccionesActivas();
  }

  aplicarFiltroFechas(): void {
    if (!this.selectedProjectId) return;
    if (this.desde && this.hasta && this.desde > this.hasta) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango inválido',
        text: 'La fecha "desde" no puede ser posterior a la fecha "hasta".',
        confirmButtonColor: '#1E3A5F',
      });
      return;
    }
    this.cargarAvance();
    this.cargarPpc();
    this.cargarPareto();
  }

  // ── Control de Avance ──────────────────────────────────────────
  cargarAvance(): void {
    if (!this.selectedProjectId) return;
    this.loadingAvance = true;
    this.avanceError = null;
    this.cdr.detectChanges();

    this.bimService.getAvance(this.selectedProjectId, this.desde, this.hasta).subscribe({
      next: (data) => {
        this.avanceData = data;
        this.loadingAvance = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingAvance = false;
        this.avanceError = this.mensajeError(err, 'No se pudo cargar el control de avance.');
        this.cdr.detectChanges();
      },
    });
  }

  semaforoDeCelda(totalRegistros: number, porcentaje: number): Semaforo {
    if (totalRegistros === 0) return 'GRIS';
    if (porcentaje >= 90) return 'VERDE';
    if (porcentaje >= 70) return 'AMARILLO';
    return 'ROJO';
  }

  semaforoColor(semaforo: Semaforo): string {
    return SEMAFORO_COLORES[semaforo];
  }

  semaforoLabel(nivelNombre: string, sectorNombre: string, totalRegistros: number, cumplidosRegistros: number, porcentaje: number): string {
    const base = `${nivelNombre} — ${sectorNombre}: `;
    if (totalRegistros === 0) return base + 'Sin registros en el rango seleccionado.';
    return base + `${porcentaje.toFixed(0)}% de avance (${cumplidosRegistros}/${totalRegistros} actividades cumplidas).`;
  }

  // ── Plan Maestro + Metas Semanales ───────────────────────────
  cargarPlanMaestro(): void {
    if (!this.selectedProjectId) return;
    this.loadingPlanMaestro = true;
    this.planMaestroError = null;
    this.cdr.detectChanges();

    this.bimService.getPlanMaestro(this.selectedProjectId).subscribe({
      next: (data) => {
        this.planMaestro = data || [];
        this.metasEditadas.clear();
        this.loadingPlanMaestro = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPlanMaestro = false;
        this.planMaestroError = this.mensajeError(err, 'No se pudo cargar el plan maestro.');
        this.cdr.detectChanges();
      },
    });
  }

  private metaKey(macroActividadId: number, fechaInicioSemana: string): string {
    return `${macroActividadId}_${fechaInicioSemana}`;
  }

  toggleEdicionMetas(): void {
    this.editandoMetas = !this.editandoMetas;
    if (!this.editandoMetas) {
      this.metasEditadas.clear();
    }
  }

  metaActual(row: PlanMaestroSemanaDto): number {
    const key = this.metaKey(row.macroActividadId, row.fechaInicioSemana);
    return this.metasEditadas.has(key) ? this.metasEditadas.get(key)! : row.metaAvance;
  }

  onMetaChange(row: PlanMaestroSemanaDto, valor: string): void {
    const key = this.metaKey(row.macroActividadId, row.fechaInicioSemana);
    const num = Number(valor);
    if (Number.isNaN(num)) return;
    this.metasEditadas.set(key, Math.min(100, Math.max(0, num)));
  }

  guardarMetas(): void {
    if (!this.selectedProjectId || this.metasEditadas.size === 0) {
      this.editandoMetas = false;
      return;
    }

    const items = this.planMaestro.map((row) => ({
      macroActividadId: row.macroActividadId,
      fechaInicioSemana: row.fechaInicioSemana,
      fechaFinSemana: row.fechaFinSemana,
      metaAvance: this.metaActual(row),
    }));

    this.savingMetas = true;
    this.cdr.detectChanges();

    this.bimService.guardarMetasSemanales(this.selectedProjectId, { items }).subscribe({
      next: () => {
        this.savingMetas = false;
        this.editandoMetas = false;
        Swal.fire({
          icon: 'success',
          title: 'Metas guardadas',
          text: 'El plan maestro se actualizó correctamente.',
          timer: 1800,
          showConfirmButton: false,
        });
        this.cargarPlanMaestro();
      },
      error: (err: HttpErrorResponse) => {
        this.savingMetas = false;
        this.cdr.detectChanges();
        const message = this.mensajeError(err, 'No se pudieron guardar las metas semanales.');
        Swal.fire({ icon: 'error', title: 'Error', text: message, confirmButtonColor: '#1E3A5F' });
      },
    });
  }

  // ── PPC ───────────────────────────────────────────────────────
  cargarPpc(): void {
    if (!this.selectedProjectId) return;
    this.loadingPpc = true;
    this.ppcError = null;
    this.cdr.detectChanges();

    this.bimService.getPpcHistorico(this.selectedProjectId, this.desde, this.hasta).subscribe({
      next: (data) => {
        this.ppcData = data;
        this.loadingPpc = false;
        this.cdr.detectChanges();
        setTimeout(() => this.renderPpcChart(), 0);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPpc = false;
        this.ppcError = this.mensajeError(err, 'No se pudo cargar el histórico de PPC.');
        this.cdr.detectChanges();
      },
    });
  }

  private renderPpcChart(): void {
    if (!this.ppcData || !this.ppcCanvasRef) return;
    this.ppcChart?.destroy();

    const dias = this.ppcData.dias || [];
    const metaPpc = this.ppcData.metaPpc ?? null;

    this.ppcChart = new Chart(this.ppcCanvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: dias.map((d) => d.fecha),
        datasets: [
          {
            label: '% PPC diario',
            data: dias.map((d) => d.porcentajePpc),
            borderColor: '#2E6DB4',
            backgroundColor: 'rgba(46,109,180,0.15)',
            fill: true,
            tension: 0.25,
            pointRadius: 3,
            pointBackgroundColor: '#2E6DB4',
          },
          ...(metaPpc !== null
            ? [
                {
                  label: `Meta PPC (${metaPpc}%)`,
                  data: dias.map(() => metaPpc),
                  borderColor: '#C0392B',
                  borderDash: [6, 4],
                  pointRadius: 0,
                  fill: false,
                },
              ]
            : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { size: 12 }, color: '#64748B' } },
          tooltip: { backgroundColor: '#1E3A5F', titleColor: '#fff', bodyColor: '#fff', cornerRadius: 6 },
        },
        scales: {
          x: { grid: { color: '#E2E8F0' } },
          y: { grid: { color: '#E2E8F0' }, min: 0, max: 100, ticks: { callback: (v) => `${v}%` } },
        },
      },
    });
  }

  // ── Pareto de causas ──────────────────────────────────────────
  cargarPareto(): void {
    if (!this.selectedProjectId) return;
    this.loadingPareto = true;
    this.paretoError = null;
    this.cdr.detectChanges();

    this.bimService.getCausasPareto(this.selectedProjectId, this.desde, this.hasta).subscribe({
      next: (data) => {
        this.paretoData = data;
        let acumulado = 0;
        this.paretoCausas = (data.causas || []).map((c) => {
          acumulado += c.porcentaje;
          return { ...c, porcentajeAcumulado: Math.min(100, acumulado) };
        });
        this.loadingPareto = false;
        this.cdr.detectChanges();
        setTimeout(() => this.renderParetoChart(), 0);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPareto = false;
        this.paretoError = this.mensajeError(err, 'No se pudo cargar el Pareto de causas.');
        this.cdr.detectChanges();
      },
    });
  }

  private renderParetoChart(): void {
    if (!this.paretoCausas.length || !this.paretoCanvasRef) return;
    this.paretoChart?.destroy();

    this.paretoChart = new Chart(this.paretoCanvasRef.nativeElement, {
      type: 'bar',
      data: {
        labels: this.paretoCausas.map((c) => c.causaNombre),
        datasets: [
          {
            type: 'bar',
            label: 'Cantidad',
            data: this.paretoCausas.map((c) => c.cantidad),
            backgroundColor: '#2E6DB4',
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: '% Acumulado',
            data: this.paretoCausas.map((c) => c.porcentajeAcumulado),
            borderColor: '#D97706',
            backgroundColor: '#D97706',
            pointRadius: 3,
            tension: 0,
            yAxisID: 'y1',
          },
          {
            type: 'line',
            label: 'Referencia 80%',
            data: this.paretoCausas.map(() => 80),
            borderColor: '#C0392B',
            borderDash: [6, 4],
            pointRadius: 0,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { size: 12 }, color: '#64748B' } },
          tooltip: { backgroundColor: '#1E3A5F', titleColor: '#fff', bodyColor: '#fff', cornerRadius: 6 },
        },
        scales: {
          x: { grid: { color: '#E2E8F0' } },
          y: { grid: { color: '#E2E8F0' }, beginAtZero: true, position: 'left' },
          y1: {
            min: 0,
            max: 100,
            position: 'right',
            grid: { display: false },
            ticks: { callback: (v) => `${v}%` },
          },
        },
      },
    });
  }

  // ── Evidencia fotográfica del día ────────────────────────────
  onFechaEvidenciasChange(fecha: string): void {
    this.fechaEvidencias = fecha;
    this.cargarEvidencias();
  }

  cargarEvidencias(): void {
    if (!this.selectedProjectId || !this.fechaEvidencias) return;
    this.loadingEvidencias = true;
    this.evidenciasError = null;
    this.cdr.detectChanges();

    this.bimService.getCargaDiaria(this.selectedProjectId, this.fechaEvidencias).subscribe({
      next: (data) => {
        this.evidencias = data.evidencias || [];
        this.loadingEvidencias = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingEvidencias = false;
        this.evidenciasError = this.mensajeError(err, 'No se pudieron cargar las evidencias fotográficas.');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Restricciones abiertas ────────────────────────────────────
  cargarRestriccionesActivas(): void {
    if (!this.selectedProjectId) return;
    this.loadingRestricciones = true;
    this.restriccionesError = null;
    this.cdr.detectChanges();

    this.bimService.getRestricciones(this.selectedProjectId, true).subscribe({
      next: (data) => {
        this.restriccionesActivas = data || [];
        this.loadingRestricciones = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingRestricciones = false;
        this.restriccionesError = this.mensajeError(err, 'No se pudo cargar el listado de restricciones abiertas.');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Manejo distinguible de errores (F9) ────────────────────────
  private mensajeError(err: HttpErrorResponse, defaultMsg: string): string {
    if (err.status === 401) return 'Sesión Expirada (401): su sesión no es válida o ha caducado. Por favor vuelva a iniciar sesión.';
    if (err.status === 403) return 'Acceso Denegado (403): no tiene permisos suficientes para ver esta información.';
    if (err.status === 404) return err.error?.message || 'No Encontrado (404): el proyecto o recurso solicitado no fue encontrado.';
    if (err.error?.message) return err.error.message;
    return defaultMsg;
  }
}
