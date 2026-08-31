import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { ErrorService } from '../../../../../../core/services/error.service';
import { TrabajadorHabService } from '../../../../services/trabajador-hab.service';
import { WorkerEventoDto } from '../../../../dtos/trabajador.model';

@Component({
  selector: 'app-historial-eventos',
  standalone: true,
  imports: [CommonModule, BaseModal],
  templateUrl: './historial-eventos.html',
  styleUrl: './historial-eventos.css',
})
export class HistorialEventos implements OnChanges {
  @Input() workerId: number | null = null;
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  eventos: WorkerEventoDto[] = [];
  loading = false;

  constructor(
    private trabajadorHabService: TrabajadorHabService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.workerId != null) {
      this.cargarEventos();
    }
  }

  private cargarEventos(): void {
    this.loading = true;
    this.eventos = [];
    this.trabajadorHabService.getEventos(this.workerId!).subscribe({
      next: (res) => {
        this.eventos = res ?? [];
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

  getDotModifier(tipoEvento: string): string {
    switch (tipoEvento) {
      case 'BAJA': return 'tl-dot--rojo';
      case 'REINGRESO': return 'tl-dot--verde';
      case 'CAMBIO_OBRA': return 'tl-dot--azul';
      case 'CAMBIO_EMPRESA': return 'tl-dot--naranja';
      default: return 'tl-dot--gris';
    }
  }

  formatTipo(tipo: string): string {
    const map: Record<string, string> = {
      BAJA: 'Baja',
      REINGRESO: 'Reingreso',
      CAMBIO_OBRA: 'Cambio de obra',
      CAMBIO_EMPRESA: 'Cambio de empresa',
      ENTREGABLE_RESETEADO: 'Entregables reseteados',
    };
    return map[tipo] ?? tipo;
  }

  close(): void {
    this.closed.emit();
  }
}
