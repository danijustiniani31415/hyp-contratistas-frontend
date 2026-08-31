import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import { ReunionAgendaDTO } from '../../dtos/actas-reunion.dto';

/**
 * Puntos extra de agenda para una reunión de agenda FIJA: los puntos fijos ya cubren lo habitual,
 * pero de vez en cuando hay que sumar un tema puntual solo para esta sesión, sin activar el flujo
 * completo de agenda dinámica (que exige a TODOS los convocados cargar sus temas antes de la
 * reunión). Cualquier participante puede agregar uno; solo quien lo agregó puede quitarlo.
 */
@Component({
  selector: 'app-temas-puntuales-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './temas-puntuales-agenda.html',
})
export class TemasPuntualesAgenda {
  @Input({ required: true }) reunionId!: number;
  @Input({ required: true }) agenda!: ReunionAgendaDTO;

  /** Emite cada vez que se agrega o elimina un tema, para que el padre refresque la agenda. */
  @Output() saved = new EventEmitter<void>();

  nuevoTema = '';
  agregando = false;

  constructor(
    private service: ActasReunionService,
    private errorService: ErrorService,
  ) {}

  agregarTema(): void {
    const texto = this.nuevoTema.trim();
    if (!texto || this.agregando) return;
    this.agregando = true;
    this.service.agregarTemaPuntual(this.reunionId, texto).subscribe({
      next: () => {
        this.agregando = false;
        this.nuevoTema = '';
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.agregando = false;
        this.errorService.handleError(err);
      },
    });
  }

  eliminarTema(reunionAgendaItemId: number): void {
    this.service.eliminarTemaPuntual(this.reunionId, reunionAgendaItemId).subscribe({
      next: () => this.saved.emit(),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }
}
