import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InterconsultaPendienteHabDto } from '../../../../dtos/trabajador.model';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';

/**
 * Widget "Interconsultas pendientes" junto al botón "EMOs Programados". Solo trabajador, razón
 * social, proyecto actual y días de retraso — sin diagnóstico/especialidad/médico, que es
 * información de salud confidencial y no debe salir del módulo de Salud Ocupacional.
 */
@Component({
  selector: 'app-interconsultas-pendientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interconsultas-pendientes.html',
  styleUrl: './interconsultas-pendientes.css',
})
export class InterconsultasPendientes implements OnInit {
  @Output() closed = new EventEmitter<void>();

  items: InterconsultaPendienteHabDto[] = [];
  loading = false;

  constructor(private trabajadorHabService: TrabajadorHabService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.trabajadorHabService.getInterconsultasPendientes().subscribe({
      next: (res) => {
        this.items = res ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  badgeClass(dias: number): string {
    if (dias >= 15) return 'badge-red';
    if (dias >= 7) return 'badge-orange';
    return 'badge-blue';
  }
}
