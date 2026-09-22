import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { LbPageHeader } from '../../../shared/components/lb-page-header/lb-page-header';
import { PlanillaCalculoService, PlanillaPeriodoDetail } from '../../../core/services/planilla-calculo.service';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-planilla-detalle',
  standalone: true,
  imports: [CommonModule, LbPageHeader],
  templateUrl: './planilla-detalle.html',
  styleUrl: './planilla-detalle.css',
})
export class PlanillaDetalleComponent implements OnInit {
  meses = MESES;
  periodo = signal<PlanillaPeriodoDetail | null>(null);
  loading = signal(false);
  calculando = signal(false);
  cerrando = signal(false);

  private periodoId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: PlanillaCalculoService,
  ) {}

  ngOnInit(): void {
    this.periodoId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.getPeriodo(this.periodoId).subscribe({
      next: (p) => {
        this.periodo.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  nombreMes(mes: number): string {
    return this.meses[mes - 1] ?? String(mes);
  }

  totalNeto(): number {
    return (this.periodo()?.detalles ?? []).reduce((sum, d) => sum + d.netoPagar, 0);
  }

  calcular(): void {
    const yaCalculado = this.periodo()?.estado === 'CALCULADO';
    const accion = () => {
      this.calculando.set(true);
      this.service.calcular(this.periodoId).subscribe({
        next: (p) => {
          this.periodo.set(p);
          this.calculando.set(false);
          Swal.fire({ icon: 'success', title: 'Planilla calculada', timer: 1500, showConfirmButton: false });
        },
        error: (err) => {
          this.calculando.set(false);
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo calcular la planilla.' });
        },
      });
    };

    if (!yaCalculado) { accion(); return; }
    Swal.fire({
      icon: 'question',
      title: '¿Recalcular esta planilla?',
      text: 'Se reemplazan todas las boletas calculadas de este período con los datos actuales.',
      showCancelButton: true,
      confirmButtonText: 'Recalcular',
      cancelButtonText: 'Cancelar',
    }).then((res) => { if (res.isConfirmed) accion(); });
  }

  cerrar(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Cerrar este período?',
      text: 'Ya no se podrá recalcular — úsalo solo cuando la planilla ya esté paga.',
      showCancelButton: true,
      confirmButtonText: 'Cerrar período',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.cerrando.set(true);
      this.service.cerrar(this.periodoId).subscribe({
        next: (p) => {
          this.periodo.set(p);
          this.cerrando.set(false);
        },
        error: (err) => {
          this.cerrando.set(false);
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo cerrar el período.' });
        },
      });
    });
  }

  volver(): void {
    this.router.navigate(['/planillas']);
  }
}
