import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AccidentesService } from '../../../../../salud-ocupacional/accidentes/accidentes.service';
import { AccidenteTrabajoDetalleDto } from '../../../../../salud-ocupacional/accidentes/accidentes.dtos';
import { ErrorService } from '../../../../../../../core/services/error.service';

@Component({
  selector: 'app-seguimiento-medico-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './seguimiento-medico-tab.component.html',
  styleUrl: './seguimiento-medico-tab.component.css',
})
export class SeguimientoMedicoTabComponent implements OnChanges {
  @Input() accidenteTrabajoId!: number;

  detalle: AccidenteTrabajoDetalleDto | null = null;
  loading = false;
  tab: 'descansos' | 'citas' | 'equipos' | 'alta' = 'descansos';

  constructor(
    private svc: AccidentesService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['accidenteTrabajoId'] && this.accidenteTrabajoId) {
      this.cargar();
    }
  }

  cargar(): void {
    this.loading = true;
    this.cdr.detectChanges();
    this.svc.getDetalle(this.accidenteTrabajoId).subscribe({
      next: (d) => {
        this.detalle = d;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  cerrarAccidente(): void {
    if (!this.detalle) return;
    const id = this.detalle.id;
    Swal.fire({
      icon: 'question',
      title: '¿Cerrar accidente?',
      html: `<p style="font-size:13px">Se cerrará el accidente #${id}. Requiere alta médica registrada y sin descansos pendientes.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.svc.cerrar(id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Accidente cerrado', timer: 1800, showConfirmButton: false });
          this.cargar();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  marcarReinduccion(): void {
    if (!this.detalle) return;
    const id = this.detalle.id;
    Swal.fire({
      icon: 'question',
      title: 'Confirmar reinducción de seguridad',
      html: `<p style="font-size:13px">¿Confirmas que <strong>${this.detalle.workerNombre ?? 'el trabajador'}</strong> completó la charla de reinducción y está autorizado para reintegrarse?</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.svc.marcarReinduccion(id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Reinducción registrada', timer: 1800, showConfirmButton: false });
          this.cargar();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
