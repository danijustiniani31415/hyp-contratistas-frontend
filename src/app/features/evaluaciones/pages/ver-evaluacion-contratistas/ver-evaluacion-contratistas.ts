import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvContratistaService } from '../../services/ev-contratista.service';
import {
  EvContratistaVerInicioDto,
  EvContratistaResumenDto,
  EvPeriodoDto,
} from '../../dtos/ev-contratista.model';

@Component({
  selector: 'app-ver-evaluacion-contratistas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './ver-evaluacion-contratistas.html',
  styleUrl: './ver-evaluacion-contratistas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerEvaluacionContratistas implements OnInit {
  data: EvContratistaVerInicioDto | null = null;
  loading = true;

  periodoId: number | null = null;
  proyectoId: number | null = null;
  busqueda = '';
  estadoFiltro: string = '';
  enviandoResultados = false;

  readonly areas = ['OF. TÉCNICA', 'SSOMA', 'RESIDENCIA', 'CALIDAD', 'PRODUCCIÓN'];

  get evaluacionesFiltradas(): EvContratistaResumenDto[] {
    if (!this.data?.evaluaciones) return [];
    const q = this.busqueda.trim().toLowerCase();
    return this.data.evaluaciones.filter((e) => {
      const matchQ =
        !q ||
        e.contributorNombre.toLowerCase().includes(q) ||
        e.contributorRuc.includes(q);
      const matchEstado = !this.estadoFiltro || e.estado === this.estadoFiltro;
      return matchQ && matchEstado;
    });
  }

  get periodoActual(): EvPeriodoDto | undefined {
    if (!this.data?.periodos.length) return undefined;
    return (
      this.data.periodos.find((p) => p.activo) ??
      this.periodoPorDefecto(this.data.periodos)
    );
  }

  // Por defecto, el mes calendario anterior al actual (el último que ya cerró), no
  // periodos[0] a secas: la lista puede incluir períodos futuros o de prueba sembrados de
  // antemano (p. ej. para poblar la tendencia histórica de gráficos) sin evaluaciones reales.
  private periodoPorDefecto(periodos: EvPeriodoDto[]): EvPeriodoDto {
    const hoy = new Date();
    const mesAnteriorMes = hoy.getMonth() === 0 ? 12 : hoy.getMonth();
    const mesAnteriorAnio = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear();
    const delMesAnterior = periodos.find((p) => p.mes === mesAnteriorMes && p.anio === mesAnteriorAnio);
    if (delMesAnterior) return delMesAnterior;

    const yaIniciados = periodos.filter(
      (p) => p.anio < hoy.getFullYear() || (p.anio === hoy.getFullYear() && p.mes <= hoy.getMonth() + 1),
    );
    return yaIniciados[0] ?? periodos[0];
  }

  estadoClase(estado: string): string {
    const map: Record<string, string> = {
      Aprobado: 'estado-aprobado',
      Regular: 'estado-regular',
      Desaprobado: 'estado-desaprobado',
      'Sin evaluar': 'estado-sin',
    };
    return map[estado] ?? '';
  }

  notaClase(nota: number | null): string {
    if (nota === null) return 'nota-sin';
    if (nota > 15) return 'nota-aprobado';
    if (nota >= 12) return 'nota-regular';
    return 'nota-desaprobado';
  }

  constructor(
    private svc: EvContratistaService,
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
          this.periodoId = (activo ?? this.periodoPorDefecto(d.periodos)).id;
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

  notaDisplay(nota: number | null): string {
    return nota !== null ? nota.toFixed(1) : '—';
  }

  countEstado(estado: string): number {
    return this.evaluacionesFiltradas.filter((e) => e.estado === estado).length;
  }

  async enviarResultados(): Promise<void> {
    if (!this.periodoId) return;

    const periodo = this.data?.periodos.find((p) => p.id === this.periodoId);
    const nombrePeriodo = periodo ? `${periodo.nombreMes} ${periodo.anio}` : 'este período';

    const confirm = await Swal.fire({
      icon: 'question',
      title: '¿Enviar resultados a los gerentes?',
      text: `Se enviará un correo a cada empresa contratista evaluada en ${nombrePeriodo} con su nota y la de sus supervisores.`,
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirm.isConfirmed) return;

    this.enviandoResultados = true;
    this.svc.enviarResultados(this.periodoId).subscribe({
      next: (r) => {
        this.enviandoResultados = false;
        const detalle =
          r.omitidosSinEmail.length > 0
            ? `<br><br>Sin correo registrado (no se enviaron):<br>${r.omitidosSinEmail.join('<br>')}`
            : '';
        Swal.fire({
          icon: 'success',
          title: 'Resultados enviados',
          html: `Se envió a <strong>${r.enviados}</strong> empresa(s).${detalle}`,
        });
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.enviandoResultados = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
