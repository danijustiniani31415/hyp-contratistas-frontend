import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  PresupuestoDetalleDto, PresupuestoLineaDto, ActualizarLineaPresupuestoDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-presupuesto-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent],
  templateUrl: './presupuesto-detalle.html',
  styleUrl: './presupuesto-detalle.css',
})
export class PresupuestoDetallePage implements OnInit {
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  private cdr    = inject(ChangeDetectorRef);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  presupuestoId!: number;
  detalle: PresupuestoDetalleDto | null = null;
  loading = false;
  aprobando = false;

  // Edición inline de línea
  editandoLineaId: number | null = null;
  formLinea: ActualizarLineaPresupuestoDto = {};

  // Acordeón de tipos
  tipoAbierto: Set<number> = new Set();

  ngOnInit(): void {
    this.presupuestoId = Number(this.route.snapshot.paramMap.get('presupuestoId'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getPresupuestoDetalle(this.presupuestoId).subscribe({
      next: (d) => {
        this.detalle = d;
        // Abrir todos los tipos por defecto
        d.tipos.forEach((t) => this.tipoAbierto.add(t.tipoId));
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleTipo(tipoId: number): void {
    if (this.tipoAbierto.has(tipoId)) this.tipoAbierto.delete(tipoId);
    else this.tipoAbierto.add(tipoId);
    this.cdr.markForCheck();
  }

  editarLinea(l: PresupuestoLineaDto): void {
    this.editandoLineaId = l.lineaId;
    this.formLinea = {
      cantidadManual: l.cantidadManual,
      precioManual:   l.precioManual,
      notasLinea:     l.notasLinea,
    };
    this.cdr.markForCheck();
  }

  cancelarEdicion(): void {
    this.editandoLineaId = null;
    this.cdr.markForCheck();
  }

  guardarLinea(lineaId: number): void {
    this.loader.show();
    this.svc.actualizarLinea(this.presupuestoId, lineaId, this.formLinea).subscribe({
      next: (d) => {
        this.detalle = d;
        this.editandoLineaId = null;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  aprobar(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar presupuesto?',
      text: 'Una vez aprobado podrás registrar el control semanal de consumo.',
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.aprobando = true;
      this.loader.show();
      this.cdr.markForCheck();
      this.svc.aprobarPresupuesto(this.presupuestoId).subscribe({
        next: () => {
          this.aprobando = false;
          this.loader.hide();
          Swal.fire({ icon: 'success', title: 'Presupuesto aprobado', timer: 1800, showConfirmButton: false });
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.aprobando = false;
          this.loader.hide();
          this.error.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }

  irAControl(): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', this.presupuestoId, 'control']);
  }

  volver(): void {
    if (this.detalle) {
      this.router.navigate(['/ssoma/gestion/presupuesto-materiales/proyecto', this.detalle.projectId]);
    }
  }

  totalEfectivo(l: PresupuestoLineaDto): number {
    const qty = l.cantidadManual ?? l.cantidadEstimada;
    const prc = l.precioManual   ?? l.precioUnitario;
    return Math.round(qty * prc * 100) / 100;
  }

  tieneOverride(l: PresupuestoLineaDto): boolean {
    return l.cantidadManual !== null || l.precioManual !== null;
  }

  /** Nombre legible de la variable base (antes se mostraba el código crudo, ej. "AREATECHADA"). */
  baseLabel(variableBase: string): string {
    switch (variableBase) {
      case 'HH': return 'Horas-Hombre';
      case 'AREATECHADA': return 'Área Techada (m²)';
      case 'TRABAJADORES': return 'Trabajadores';
      case 'CALCULADO': return 'Calculado (sin ratio real)';
      case 'FIJO': return 'Monto fijo';
      case 'METRADO': return 'Metrado';
      default: return variableBase;
    }
  }
}
